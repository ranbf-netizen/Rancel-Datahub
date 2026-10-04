import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";
import { getSmmServices } from "@/lib/smm";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });

  const { serviceId, link, quantity } = await req.json();
  if (!serviceId || !link || !quantity) {
    return NextResponse.json({ error: "Service, link and quantity are required." }, { status: 400 });
  }
  const qty = Number(quantity);

  const settings = await prisma.smmSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });

  // Re-price server-side from the live catalog (never trust a client price).
  let services: any[] = [];
  try { services = await getSmmServices(); } catch (err: any) {
    return NextResponse.json({ error: "Could not price this order right now." }, { status: 502 });
  }
  const svc = services.find((s: any) => Number(s.service) === Number(serviceId));
  if (!svc) return NextResponse.json({ error: "Service not available." }, { status: 404 });

  const min = Number(svc.min) || 1, max = Number(svc.max) || 100000;
  if (qty < min || qty > max) {
    return NextResponse.json({ error: `Quantity must be between ${min} and ${max}.` }, { status: 400 });
  }

  // GainRealGrowth is GHS-native - svc.rate is already a GH₵ price per 1000,
  // NOT USD. Do not multiply by usdToGhs here (that was the bug: it was
  // double-converting an already-GHS number and inflating prices ~12x).
  // Only the markup gets applied on top of the panel's real GHS cost.
  const ghsPer1000 = Number(svc.rate) || 0;
  const amount = Math.round(ghsPer1000 * (1 + settings.markupPct / 100) * (qty / 1000) * 100) / 100;
  if (amount <= 0) return NextResponse.json({ error: "Invalid price." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
  const reference = `RDH-BOOST-${uuid()}`;

  await prisma.boostOrder.create({
    data: {
      userId: session.userId,
      serviceId: Number(serviceId),
      serviceName: String(svc.name),
      link, quantity: qty, amount,
      paystackReference: reference,
      paymentStatus: "PENDING",
    },
  });

  try {
    const tx = await initializeTransaction({
      email: user?.email || `${session.userId}@user.rancel-datahub.com`,
      amountGhs: amount,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/shop/boosting?ref=${reference}`,
      metadata: { orderType: "boost", reference },
    });
    return NextResponse.json({ reference, amount, authorizationUrl: tx.authorization_url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Payment could not be started." }, { status: 502 });
  }
}

// Customer's own boost orders.
export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });
  const orders = await prisma.boostOrder.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, serviceName: true, link: true, quantity: true, amount: true, paymentStatus: true, panelStatus: true, createdAt: true },
  });
  return NextResponse.json({ orders });
}
