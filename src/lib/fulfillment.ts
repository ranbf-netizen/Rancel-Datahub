import { prisma } from "@/lib/db";
import { placeOrder } from "@/lib/supplier";

// Called once we're SURE a data order was paid (from webhook or manual verify).
// Safe to call twice - it no-ops if the order is already marked PAID.
export async function fulfillDataOrder(reference: string) {
  const order = await prisma.dataOrder.findUnique({
    where: { paystackReference: reference },
    include: { bundle: true },
  });
  if (!order) return { found: false as const };
  if (order.paymentStatus === "PAID") return { found: true as const, alreadyProcessed: true as const, order };

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

    const updated = await prisma.dataOrder.update({
      where: { id: order.id },
      data: { fulfillmentStatus: "DELIVERED", supplierOrderId: String(result.orderId) },
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

// Called once we're SURE a pin order was paid. Safe to call twice.
export async function fulfillPinOrder(reference: string) {
  const order = await prisma.pinOrder.findUnique({ where: { paystackReference: reference } });
  if (!order) return { found: false as const };
  if (order.paymentStatus === "PAID") return { found: true as const, alreadyProcessed: true as const, order };

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
