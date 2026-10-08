import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSmsPoolPrice, getSmsPoolBalance, orderSmsPoolNumber } from "@/lib/smspool";
import { refundOrder } from "@/lib/smsWallet";

export const dynamic = "force-dynamic";

// Orders are now paid for out of the buyer's SMS wallet balance, not a fresh
// Paystack charge per order - that's what makes an instant, automatic
// refund possible if the rental fails or no code ever arrives (see
// handleFailure below, and the expiry check in status/route.ts).
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });

  const { countryId, countryName, serviceId, serviceName } = await req.json();
  if (!countryId || !serviceId) {
    return NextResponse.json({ error: "Country and service are required." }, { status: 400 });
  }

  const settings = await prisma.smsPoolSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });

  // Re-price server-side from SMSPool directly (never trust a client price).
  let amount: number;
  try {
    const usd = await getSmsPoolPrice(countryId, serviceId);
    amount = Math.round(usd * settings.usdToGhs * (1 + settings.markupPct / 100) * 100) / 100;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not price this order right now." }, { status: 502 });
  }
  if (amount <= 0) return NextResponse.json({ error: "Invalid price." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { smsWalletBalance: true } });
  const balance = user?.smsWalletBalance ?? 0;
  if (balance < amount) {
    return NextResponse.json({
      error: "INSUFFICIENT_BALANCE",
      message: `Your SMS wallet balance (GH₵${balance.toFixed(2)}) isn't enough for this GH₵${amount.toFixed(2)} order. Top up to continue.`,
      balance,
      needed: amount,
    }, { status: 402 });
  }

  const reference = `RDH-SMS-${uuid()}`;

  // Atomic debit: the `gte: amount` guard means if two orders race each
  // other for the same balance, only as many as the balance actually covers
  // will succeed - the rest correctly fail with INSUFFICIENT_BALANCE rather
  // than both silently succeeding and overdrawing the wallet.
  const order = await prisma.$transaction(async (db) => {
    const debited = await db.user.updateMany({
      where: { id: session.userId, smsWalletBalance: { gte: amount } },
      data: { smsWalletBalance: { decrement: amount } },
    });
    if (debited.count !== 1) return null;

    const created = await db.smsOrder.create({
      data: {
        userId: session.userId,
        countryId: String(countryId),
        countryName: String(countryName || countryId),
        serviceId: String(serviceId),
        serviceName: String(serviceName || serviceId),
        amount,
        paystackReference: reference,
        paymentStatus: "PAID",
        status: "PENDING",
      },
    });

    await db.smsWalletTransaction.create({
      data: {
        userId: session.userId,
        type: "DEBIT",
        amount,
        relatedOrderId: created.id,
        description: `${serviceName || serviceId} - ${countryName || countryId}`,
      },
    });

    return created;
  });

  if (!order) {
    return NextResponse.json({
      error: "INSUFFICIENT_BALANCE",
      message: "Your wallet balance changed before this order could go through. Please check your balance and try again.",
    }, { status: 402 });
  }

  // Attempt the actual rental immediately - no webhook needed, payment
  // already happened via the wallet debit above.
  try {
    const panelBalance = await getSmsPoolBalance();
    if (panelBalance <= 0) throw new Error("SMSPool balance is empty.");
    const result = await orderSmsPoolNumber({ countryId: String(countryId), serviceId: String(serviceId) });
    await prisma.smsOrder.update({
      where: { id: order.id },
      data: {
        poolOrderId: result.orderId,
        phoneNumber: result.number,
        status: "WAITING",
        expiresAt: new Date(Date.now() + result.expiresInSeconds * 1000),
      },
    });
  } catch (err: any) {
    // Rental failed outright (not "no code yet" - actually couldn't get a
    // number at all) - refund the wallet right now rather than making the
    // buyer wait for a timeout that was never going to resolve.
    await prisma.smsOrder.update({ where: { id: order.id }, data: { status: `FAILED: ${err.message}` } });
    await refundOrder(order.id, session.userId, amount, `Rental failed: ${err.message}`);
  }

  return NextResponse.json({ reference });
}

// Customer's own SMS number orders - only ones actually paid for.
export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });
  const orders = await prisma.smsOrder.findMany({
    where: { userId: session.userId, paymentStatus: "PAID" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, countryName: true, serviceName: true, amount: true, paymentStatus: true, status: true, phoneNumber: true, smsCode: true, createdAt: true, paystackReference: true },
  });
  return NextResponse.json({ orders });
}
