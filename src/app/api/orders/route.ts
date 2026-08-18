import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";

// Creates a PENDING data order, then starts a Paystack transaction for it.
// The order is only fulfilled (supplier API called) once the webhook confirms payment.
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { bundleId, beneficiaryNumber } = await req.json();
  if (!bundleId || !beneficiaryNumber) {
    return NextResponse.json({ error: "Bundle and recipient number are required." }, { status: 400 });
  }

  const bundle = await prisma.dataBundle.findUnique({ where: { id: bundleId } });
  if (!bundle || !bundle.active) {
    return NextResponse.json({ error: "That bundle is not available." }, { status: 404 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const reference = `RDH-DATA-${uuid()}`;

  const order = await prisma.dataOrder.create({
    data: {
      userId: user.id,
      bundleId: bundle.id,
      beneficiaryNumber,
      amount: bundle.sellingPrice,
      paystackReference: reference,
      paymentStatus: "PENDING",
    },
  });

  try {
    const tx = await initializeTransaction({
      email: user.email,
      amountGhs: bundle.sellingPrice,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders?ref=${reference}`,
      metadata: { orderId: order.id, orderType: "data" },
    });
    return NextResponse.json({ orderId: order.id, authorizationUrl: tx.authorization_url });
  } catch (err: any) {
    // Paystack not configured yet (keys blank) - order stays PENDING, tell caller clearly.
    return NextResponse.json(
      { orderId: order.id, error: err.message || "Payment could not be started." },
      { status: 503 }
    );
  }
}

// List the logged-in user's data orders.
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
