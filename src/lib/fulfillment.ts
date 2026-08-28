import { prisma } from "@/lib/db";
import { placeOrder, submitAfaRegistration } from "@/lib/supplier";

// Called once we're SURE a data order was paid (from webhook or manual verify).
// With Cledanet, placing the order only confirms it was ACCEPTED (status
// "PENDING") - actual delivery completion arrives later, either via their
// optional callback (see /api/webhooks/cledanet/route.ts) or via the sweep
// polling GET /order/:id (sweep-pending), since the callback's exact payload
// shape isn't confirmed - the sweep's polling is the reliable source of truth.
export async function fulfillDataOrder(reference: string) {
  const order = await prisma.dataOrder.findUnique({
    where: { paystackReference: reference },
    include: { bundle: true },
  });
  if (!order) return { found: false as const };
  // Only skip if this genuinely already reached a final state. Being marked
  // PAID alone isn't enough - an earlier attempt may have been interrupted
  // (e.g. a temporary outage) right after marking PAID but before ever calling
  // the supplier, which would otherwise leave the order stuck forever. PROCESSING
  // is also not final - that just means we're waiting on confirmation.
  if (
    order.paymentStatus === "PAID" &&
    (order.fulfillmentStatus === "DELIVERED" || order.fulfillmentStatus === "FAILED")
  ) {
    return { found: true as const, alreadyProcessed: true as const, order };
  }

  // If already PROCESSING with a supplier reference, we've already placed this
  // order - don't place it again, just leave it for the webhook/sweep to resolve.
  if (order.paymentStatus === "PAID" && order.fulfillmentStatus === "PROCESSING" && order.supplierOrderId) {
    return { found: true as const, alreadyProcessed: true as const, order };
  }

  await prisma.dataOrder.update({
    where: { id: order.id },
    data: { paymentStatus: "PAID", fulfillmentStatus: "PROCESSING" },
  });

  try {
    const result = await placeOrder({
      network: order.bundle.network as any,
      beneficiary: order.beneficiaryNumber,
      packageId: order.bundle.dataSizeGb, // Cledanet identifies bundles by size, not a package ID
    });

    // Still PROCESSING - store their order id so the sweep/webhook can match it
    // back to this order. Only that confirmation marks DELIVERED.
    const updated = await prisma.dataOrder.update({
      where: { id: order.id },
      data: { supplierOrderId: result.orderId },
      include: { bundle: true },
    });

    // Commission is credited at PAYMENT (here — this runs the moment payment is
    // confirmed), not at delivery, because Cledanet's delivery confirmation can
    // lag. If the order later fails and is refunded, the commission is clawed
    // back (see clawbackAgentCommission in the failure paths below).
    await creditAgentCommission(order, reference);

    return { found: true as const, alreadyProcessed: false as const, order: updated };
  } catch (err: any) {
    const updated = await prisma.dataOrder.update({
      where: { id: order.id },
      data: { fulfillmentStatus: "FAILED", failureReason: err.message },
      include: { bundle: true },
    });
    // Order failed right after payment - reverse any commission we credited.
    await clawbackAgentCommission(order, reference);
    await prisma.refund.create({
      data: {
        orderType: "data",
        orderId: order.id,
        reason: `Fulfillment failed after payment: ${err.message}`,
      },
    });
    return { found: true as const, alreadyProcessed: false as const, order: updated };
  }
}

// Credit an agent's storefront commission to their wallet. Idempotent: only
// credits when no commission transaction already exists for this reference.
async function creditAgentCommission(
  order: { referredByAgentId: string | null; agentCommission: number | null; bundle: { dataSizeGb: number; network: string } },
  reference: string
) {
  if (!order.referredByAgentId || !order.agentCommission || order.agentCommission <= 0) return;
  const already = await prisma.agentTransaction.findFirst({ where: { paystackReference: reference } });
  if (already) return;
  await prisma.$transaction([
    prisma.agentProfile.update({
      where: { id: order.referredByAgentId },
      data: { walletBalance: { increment: order.agentCommission } },
    }),
    prisma.agentTransaction.create({
      data: {
        agentId: order.referredByAgentId,
        type: "SALE",
        amount: order.agentCommission,
        description: `Storefront commission - ${order.bundle.dataSizeGb}GB ${order.bundle.network}`,
        paystackReference: reference,
      },
    }),
  ]);
}

// Reverse a previously credited commission when a paid order later fails/refunds.
// Idempotent: only reverses a commission that was actually credited and not yet
// reversed.
async function clawbackAgentCommission(
  order: { id: string; referredByAgentId: string | null; agentCommission: number | null },
  reference: string
) {
  if (!order.referredByAgentId || !order.agentCommission || order.agentCommission <= 0) return;
  const credit = await prisma.agentTransaction.findFirst({ where: { paystackReference: reference, type: "SALE" } });
  if (!credit) return; // nothing was credited
  const alreadyReversed = await prisma.agentTransaction.findFirst({
    where: { agentId: order.referredByAgentId, description: `Commission reversed - order ${order.id}` },
  });
  if (alreadyReversed) return;
  await prisma.$transaction([
    prisma.agentProfile.update({
      where: { id: order.referredByAgentId },
      data: { walletBalance: { decrement: order.agentCommission } },
    }),
    prisma.agentTransaction.create({
      data: {
        agentId: order.referredByAgentId,
        type: "SALE",
        amount: -order.agentCommission,
        description: `Commission reversed - order ${order.id}`,
      },
    }),
  ]);
}

// Called once we have a confirmed final delivery outcome for a data order -
// either from the sweep's poll of GET /order/:id, or from the webhook (treated
// as a "go check now" trigger rather than a trusted source, since Cledanet's
// callback payload shape and signing scheme aren't documented). Matches by
// their order id (stored as supplierOrderId when the order was placed).
export async function resolveDataOrderDelivery(supplierOrderId: string, outcome: "DELIVERED" | "FAILED", failureReason?: string) {
  const order = await prisma.dataOrder.findFirst({ where: { supplierOrderId } });
  if (!order) return { found: false as const };
  if (order.fulfillmentStatus === "DELIVERED" || order.fulfillmentStatus === "FAILED") {
    return { found: true as const, alreadyProcessed: true as const }; // already resolved
  }

  await prisma.dataOrder.update({
    where: { id: order.id },
    data: { fulfillmentStatus: outcome, ...(failureReason ? { failureReason } : {}) },
  });

  if (outcome === "FAILED") {
    await clawbackAgentCommission(order, order.paystackReference);
    await prisma.refund.create({
      data: {
        orderType: "data",
        orderId: order.id,
        reason: failureReason || "Supplier reported delivery failure.",
      },
    });
  }

  return { found: true as const, alreadyProcessed: false as const };
}

// Called once we're SURE an agent wallet top-up was paid. Safe to call twice.
export async function fulfillAgentTopup(reference: string) {
  const txn = await prisma.agentTransaction.findUnique({ where: { paystackReference: reference } });
  if (!txn) return { found: false as const };
  if (txn.status === "COMPLETED") return { found: true as const, alreadyProcessed: true as const };

  await prisma.$transaction([
    prisma.agentTransaction.update({ where: { id: txn.id }, data: { status: "COMPLETED" } }),
    prisma.agentProfile.update({
      where: { id: txn.agentId },
      data: { walletBalance: { increment: txn.amount } },
    }),
  ]);

  return { found: true as const, alreadyProcessed: false as const };
}

export async function fulfillPinOrder(reference: string) {
  const order = await prisma.pinOrder.findUnique({ where: { paystackReference: reference } });
  if (!order) return { found: false as const };
  // Same reasoning as fulfillDataOrder - PAID alone doesn't mean a PIN was
  // actually assigned, an interrupted attempt could leave this stuck otherwise.
  if (order.paymentStatus === "PAID" && order.pinId) {
    return { found: true as const, alreadyProcessed: true as const, order };
  }

  const pin = await prisma.pin.findFirst({
    where: { status: "AVAILABLE", batch: { examType: order.examType, year: order.year } },
  });

  if (!pin) {
    const updated = await prisma.pinOrder.update({ where: { id: order.id }, data: { paymentStatus: "PAID" } });
    await prisma.refund.create({
      data: {
        orderType: "pin",
        orderId: order.id,
        reason: "Payment succeeded but stock ran out before a PIN could be assigned.",
      },
    });
    return { found: true as const, alreadyProcessed: false as const, order: updated };
  }

  const [, updatedOrder] = await prisma.$transaction([
    prisma.pin.update({
      where: { id: pin.id },
      data: { status: "SOLD", soldToUserId: order.userId, soldAt: new Date() },
    }),
    prisma.pinOrder.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", pinId: pin.id },
    }),
  ]);

  return { found: true as const, alreadyProcessed: false as const, order: updatedOrder };
}

// Called once we're SURE an AFA registration order was paid. Submits the
// registration to Cledanet. There's no documented GET-by-id endpoint for AFA
// status specifically, so once submitted we rely on Cledanet's optional
// callback for status updates - admin can also check Cledanet's own dashboard
// directly as the ultimate source of truth if a registration seems stuck.
export async function fulfillAfaOrder(reference: string) {
  const order = await prisma.afaOrder.findUnique({ where: { paystackReference: reference } });
  if (!order) return { found: false as const };
  if (order.paymentStatus === "PAID" && order.supplierId) {
    return { found: true as const, alreadyProcessed: true as const, order };
  }

  await prisma.afaOrder.update({ where: { id: order.id }, data: { paymentStatus: "PAID" } });

  try {
    const result = await submitAfaRegistration({
      fullName: order.fullName,
      phoneNumber: order.phoneNumber,
      idNumber: order.idNumber,
      dateOfBirth: order.dateOfBirth,
      town: order.town,
      occupation: order.occupation,
      region: order.region,
      cropProduce: order.cropProduce || undefined,
    });

    const updated = await prisma.afaOrder.update({
      where: { id: order.id },
      data: { supplierId: result.supplierId, supplierStatus: result.status },
    });
    return { found: true as const, alreadyProcessed: false as const, order: updated };
  } catch (err: any) {
    const updated = await prisma.afaOrder.update({
      where: { id: order.id },
      data: { failureReason: err.message },
    });
    await prisma.refund.create({
      data: {
        orderType: "afa",
        orderId: order.id,
        reason: `AFA submission failed after payment: ${err.message}`,
      },
    });
    return { found: true as const, alreadyProcessed: false as const, order: updated };
  }
}
