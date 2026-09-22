import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

// Creates a PENDING data order, then starts a Paystack transaction for it.
// Works for both logged-in customers AND guests (no account needed to buy).
// The order is only fulfilled (supplier API called) once the webhook confirms payment.
export async function POST(req: NextRequest) {
  const session = getSession();
  const { bundleId, beneficiaryNumber } = await req.json();

  if (!bundleId || !beneficiaryNumber) {
    return NextResponse.json({ error: "Bundle and recipient number are required." }, { status: 400 });
  }
  if (!isValidGhanaNumber(beneficiaryNumber)) {
    return NextResponse.json({ error: "Enter a valid 10-digit Ghana number, e.g. 0241234567." }, { status: 400 });
  }

  const bundle = await prisma.dataBundle.findUnique({ where: { id: bundleId } });
  if (!bundle || !bundle.active) {
    return NextResponse.json({ error: "That bundle is not available." }, { status: 404 });
  }

  let userId: string | null = null;
  let email: string;

  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    userId = user.id;
    email = user.email;
  } else {
    // Guest checkout - Paystack requires an email, so synthesize one from the phone number.
    email = `${beneficiaryNumber}@guest.rancel-datahub.com`;
  }

  const reference = `RDH-DATA-${uuid()}`;

  const order = await prisma.dataOrder.create({
    data: {
      userId,
      guestEmail: userId ? null : email,
      bundleId: bundle.id,
      beneficiaryNumber,
      amount: bundle.sellingPrice,
      paystackReference: reference,
      paymentStatus: "PENDING",
    },
  });

  try {
    const tx = await initializeTransaction({
      email,
      amountGhs: bundle.sellingPrice,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/track?ref=${reference}`,
      metadata: { orderId: order.id, orderType: "data" },
    });
    return NextResponse.json({ orderId: order.id, reference, authorizationUrl: tx.authorization_url });
  } catch (err: any) {
    return NextResponse.json(
      { orderId: order.id, reference, error: err.message || "Payment could not be started." },
      { status: 503 }
    );
  }
}

// List the logged-in user's data orders. Guests use /track instead.
export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const orders = await prisma.dataOrder.findMany({
    where: { userId: session.userId },
    include: { bundle: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}
