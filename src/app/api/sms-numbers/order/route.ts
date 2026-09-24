import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";
import { getSmsPoolPrice } from "@/lib/smspool";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });

  const { countryId, countryName, serviceId, serviceName } = await req.json();
  if (!countryId || !serviceId) {
    return NextResponse.json({ error: "Country and service are required." }, { status: 400 });
  }

  const settings = await prisma.smmSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });

  // Re-price server-side from SMSPool directly (never trust a client price).
  let amount: number;
  try {
    const usd = await getSmsPoolPrice(countryId, serviceId);
    amount = Math.round(usd * settings.usdToGhs * (1 + settings.markupPct / 100) * 100) / 100;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not price this order right now." }, { status: 502 });
  }
  if (amount <= 0) return NextResponse.json({ error: "Invalid price." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
  const reference = `RDH-SMS-${uuid()}`;

  await prisma.smsOrder.create({
    data: {
      userId: session.userId,
      countryId: String(countryId),
      countryName: String(countryName || countryId),
      serviceId: String(serviceId),
      serviceName: String(serviceName || serviceId),
      amount,
      paystackReference: reference,
      paymentStatus: "PENDING",
      status: "PENDING",
    },
  });

  try {
    const tx = await initializeTransaction({
      email: user?.email || `${session.userId}@user.rancel-datahub.com`,
      amountGhs: amount,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/shop/sms-numbers?ref=${reference}`,
      metadata: { orderType: "sms_number", reference },
    });
    return NextResponse.json({ reference, amount, authorizationUrl: tx.authorization_url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Payment could not be started." }, { status: 502 });
  }
}

// Customer's own SMS number orders.
export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });
  const orders = await prisma.smsOrder.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, countryName: true, serviceName: true, amount: true, paymentStatus: true, status: true, phoneNumber: true, smsCode: true, createdAt: true, paystackReference: true },
  });
  return NextResponse.json({ orders });
}
