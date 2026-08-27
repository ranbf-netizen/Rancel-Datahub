import { NextRequest, NextResponse } from "next/server";
import { verifyTransaction } from "@/lib/paystack";
import { fulfillDataOrder, fulfillPinOrder, fulfillAfaOrder } from "@/lib/fulfillment";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Actively asks Paystack "did this payment go through?" instead of only waiting
// for their webhook to arrive. Used in two places:
//   1. Automatically, when a customer lands back on /orders after checkout.
//   2. Manually, via the admin "Check now" button on a stuck Pending order.
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { reference } = await req.json();
  if (!reference) return NextResponse.json({ error: "Reference is required." }, { status: 400 });

  // Figure out which kind of order this reference belongs to.
  const dataOrder = await prisma.dataOrder.findUnique({ where: { paystackReference: reference } });
  const pinOrder = dataOrder ? null : await prisma.pinOrder.findUnique({ where: { paystackReference: reference } });
  const afaOrder = dataOrder || pinOrder ? null : await prisma.afaOrder.findUnique({ where: { paystackReference: reference } });

  if (!dataOrder && !pinOrder && !afaOrder) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  // Only the order's owner or an admin can trigger a check.
  const ownerId = dataOrder ? dataOrder.userId : pinOrder ? pinOrder.userId : afaOrder!.userId;
  if (ownerId !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let paystackStatus: string;
  try {
    const tx = await verifyTransaction(reference);
    paystackStatus = tx.status; // "success" | "failed" | "abandoned" etc.
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not reach Paystack." }, { status: 503 });
  }

  if (paystackStatus !== "success") {
    // Genuinely not paid (failed/abandoned) - mark it so it stops showing as Pending forever.
    if (dataOrder && dataOrder.paymentStatus === "PENDING") {
      await prisma.dataOrder.update({ where: { id: dataOrder.id }, data: { paymentStatus: "FAILED" } });
    }
    if (pinOrder && pinOrder.paymentStatus === "PENDING") {
      await prisma.pinOrder.update({ where: { id: pinOrder.id }, data: { paymentStatus: "FAILED" } });
    }
    if (afaOrder && afaOrder.paymentStatus === "PENDING") {
      await prisma.afaOrder.update({ where: { id: afaOrder.id }, data: { paymentStatus: "FAILED" } });
    }
    return NextResponse.json({ paystackStatus, fulfilled: false });
  }

  // Paystack confirms it was paid - fulfill it now (safe even if the webhook already did this).
  const result = dataOrder
    ? await fulfillDataOrder(reference)
    : pinOrder
    ? await fulfillPinOrder(reference)
    : await fulfillAfaOrder(reference);
  return NextResponse.json({ paystackStatus, fulfilled: true, result });
}
