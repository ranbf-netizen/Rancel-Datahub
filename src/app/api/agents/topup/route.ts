import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

// Starts a real Paystack payment to top up the agent's wallet. Wallet is only
// credited once the webhook confirms payment (see /api/paystack/webhook).
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { amount } = await req.json();
  const amountGhs = Number(amount);
  if (!amountGhs || amountGhs <= 0) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }

  const profile = await prisma.agentProfile.findUnique({ where: { userId: session.userId } });
  if (!profile || profile.status !== "APPROVED") {
    return NextResponse.json({ error: "You need an approved agent account first." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const reference = `RDH-AGENTTOPUP-${uuid()}`;

  // Recorded as PENDING now, flipped to COMPLETED by the webhook once paid.
  await prisma.agentTransaction.create({
    data: {
      agentId: profile.id,
      type: "TOPUP",
      amount: amountGhs,
      paystackReference: reference,
      status: "PENDING",
      description: "Wallet top-up",
    },
  });

  try {
    const tx = await initializeTransaction({
      email: user!.email,
      amountGhs,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/agent?topup=${reference}`,
      metadata: { orderType: "agent_topup", agentId: profile.id },
    });
    return NextResponse.json({ authorizationUrl: tx.authorization_url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Payment could not be started." }, { status: 503 });
  }
}
