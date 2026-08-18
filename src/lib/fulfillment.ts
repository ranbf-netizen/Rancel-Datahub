import { prisma } from "@/lib/db";
import { placeOrder } from "@/lib/supplier";

// Called once we're SURE a data order was paid (from webhook or manual verify).
// With DataMart, placing the order only confirms it was ACCEPTED - actual
// delivery completion arrives later via their webhook (order.completed /
// order.failed), handled in /api/webhooks/datamart/route.ts. This function
// only gets the order to PROCESSING with their reference stored; the sweep
// (sweep-pending) also double-checks anything stuck in PROCESSING too long,
// in case their webhook never arrives.
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
  // is also not final - that just means we're waiting on DataMart's webhook.
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
      packageId: Number(order.bundle.supplierPackageId),
    });

    // Still PROCESSING - store their reference so the webhook can match it back
    // to this order. Only their webhook (or the fallback sweep) marks DELIVERED.
    const updated = await prisma.dataOrder.update({
      where: { id: order.id },
      data: { supplierOrderId: result.orderId },
      include: { bundle: true },
    });
    return { found: true as const, alreadyProcessed: false as const, order: updated };
  } catch (err: any) {
    const updated = await prisma.dataOrder.update({
      where: { id: order.id },
      data: { fulfillmentStatus: "FAILED", failureReason: err.message },
      include: { bundle: true },
    });
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

// Called by the DataMart webhook (order.completed / order.failed) once they've
// actually finished delivering - or not - a bundle. Matches by their reference
// (stored as supplierOrderId when the order was placed).
export async function resolveDataOrderDelivery(supplierOrderId: string, outcome: "DELIVERED" | "FAILED", failureReason?: string) {
  const order = await prisma.dataOrder.findFirst({ where: { supplierOrderId } });
  if (!order) return { found: false as const };
  if (order.fulfillmentStatus === "DELIVERED" || order.fulfillmentStatus === "FAILED") {
    return { found: true as const, alreadyProcessed: true as const }; // already resolved, ignore duplicate webhook delivery
  }

  await prisma.dataOrder.update({
    where: { id: order.id },
    data: { fulfillmentStatus: outcome, ...(failureReason ? { failureReason } : {}) },
  });

  if (outcome === "FAILED") {
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
