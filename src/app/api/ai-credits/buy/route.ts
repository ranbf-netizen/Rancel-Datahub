import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

const CREDITS = 10;
const PRICE = 5;

export async function POST() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const reference = `RDH-CREDITS-${uuid()}`;
  await prisma.aiCreditPurchase.create({
    data: { userId: session.userId, credits: CREDITS, amount: PRICE, paystackReference: reference, paymentStatus: "PENDING" },
  });

  try {
    const tx = await initializeTransaction({
      email: user.email,
      amountGhs: PRICE,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/tools?credits=added`,
      metadata: { orderType: "ai_credits", reference },
    });
    return NextResponse.json({ reference, authorizationUrl: tx.authorization_url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Payment could not be started." }, { status: 502 });
  }
}
