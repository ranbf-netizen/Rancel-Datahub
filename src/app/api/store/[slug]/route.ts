import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

// Storefront markup is fixed at 4.7% for all agents (not agent-configurable).
const FIXED_STORE_MARKUP = 4.7;

function markedUp(sellingPrice: number, _markupPct: number) {
  return Math.round(sellingPrice * (1 + FIXED_STORE_MARKUP / 100) * 100) / 100;
}

// GET /api/store/[slug] — public storefront data: store name + bundles at the
// agent's marked-up prices. No cost data is exposed.
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const profile = await prisma.agentProfile.findUnique({
    where: { storeSlug: params.slug },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!profile || profile.status !== "APPROVED") {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const bundles = await prisma.dataBundle.findMany({
    where: { active: true },
    orderBy: [{ network: "asc" }, { dataSizeGb: "asc" }],
    select: { id: true, network: true, label: true, dataSizeGb: true, sellingPrice: true, validityDays: true },
  });

  return NextResponse.json({
    storeName: profile.user.name,
    storePhone: profile.user.phone, // the agent's own number, for WhatsApp support
    slug: profile.storeSlug,
    markup: profile.storeMarkup,
    bundles: bundles.map((b: { id: string; network: string; dataSizeGb: number; validityDays: number; sellingPrice: number }) => ({
      id: b.id,
      network: b.network,
      dataSizeGb: b.dataSizeGb,
      validityDays: b.validityDays,
      price: markedUp(b.sellingPrice, profile.storeMarkup), // what the customer pays
    })),
  });
}

// POST /api/store/[slug] — customer buys through this agent's storefront.
// Customer pays via OUR Paystack; the agent's markup is recorded as commission
// and credited to their earnings on delivery (see fulfillment).
export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  const { bundleId, beneficiaryNumber } = await req.json();

  if (!bundleId || !beneficiaryNumber) {
    return NextResponse.json({ error: "Bundle and recipient number are required." }, { status: 400 });
  }
  if (!isValidGhanaNumber(beneficiaryNumber)) {
    return NextResponse.json({ error: "Enter a valid 10-digit Ghana number, e.g. 0241234567." }, { status: 400 });
  }

  const profile = await prisma.agentProfile.findUnique({ where: { storeSlug: params.slug } });
  if (!profile || profile.status !== "APPROVED") {
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  }

  const bundle = await prisma.dataBundle.findUnique({ where: { id: bundleId } });
  if (!bundle || !bundle.active) {
    return NextResponse.json({ error: "That bundle is not available." }, { status: 404 });
  }

  const customerPrice = markedUp(bundle.sellingPrice, profile.storeMarkup);
  // Agent commission = ONLY the markup portion (customer price minus normal retail).
  const commission = Math.round((customerPrice - bundle.sellingPrice) * 100) / 100;

  const reference = `RDH-STORE-${uuid()}`;
  const email = `${beneficiaryNumber}@guest.rancel-datahub.com`;

  const order = await prisma.dataOrder.create({
    data: {
      guestEmail: email,
      bundleId: bundle.id,
      beneficiaryNumber,
      amount: customerPrice,
      paystackReference: reference,
      paymentStatus: "PENDING",
      referredByAgentId: profile.id,
      agentCommission: commission,
    },
  });

  try {
    const tx = await initializeTransaction({
      email,
      amountGhs: customerPrice,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/track?ref=${reference}&store=${params.slug}`,
      metadata: { orderId: order.id, orderType: "data" },
    });
    return NextResponse.json({ orderId: order.id, reference, authorizationUrl: tx.authorization_url });
  } catch (err: any) {
    return NextResponse.json(
      { orderId: order.id, reference, error: err.message || "Payment could not be started." },
      { status: 502 }
    );
  }
}