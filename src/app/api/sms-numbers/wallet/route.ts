import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

const MIN_DEPOSIT = 30;

// Current balance + recent transaction history for the logged-in user's
// SMS Numbers wallet.
export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { smsWalletBalance: true, email: true } });
  const transactions = await prisma.smsWalletTransaction.findMany({
    where: { userId: session.userId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ balance: user?.smsWalletBalance ?? 0, transactions });
}

// Start a deposit - creates a PENDING ledger row and a Paystack transaction.
// The balance is only actually credited once the webhook confirms payment
// (see fulfillSmsWalletTopup in fulfillment.ts) - never on this call, since
// the money hasn't arrived yet.
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });

  const { amount } = await req.json();
  const depositAmount = Number(amount);
  if (!depositAmount || depositAmount < MIN_DEPOSIT) {
    return NextResponse.json({ error: `Minimum deposit is GH₵${MIN_DEPOSIT}.` }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
  const reference = `RDH-SMSWALLET-${uuid()}`;

  await prisma.smsWalletTransaction.create({
    data: {
      userId: session.userId,
      type: "DEPOSIT",
      amount: depositAmount,
      status: "PENDING",
      paystackReference: reference,
      description: "Wallet top-up",
    },
  });

  try {
    const tx = await initializeTransaction({
      email: user?.email || `${session.userId}@user.rancel-datahub.com`,
      amountGhs: depositAmount,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/shop/sms-numbers?walletRef=${reference}`,
      metadata: { orderType: "sms_wallet_topup", reference },
    });
    return NextResponse.json({ reference, authorizationUrl: tx.authorization_url });
  } catch (err: any) {
    // Clean up the pending row so it doesn't sit there forever if payment
    // never actually started.
    await prisma.smsWalletTransaction.deleteMany({ where: { paystackReference: reference, status: "PENDING" } });
    return NextResponse.json({ error: err.message || "Could not start deposit." }, { status: 502 });
  }
}
