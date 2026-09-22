import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

// GET: public - current AFA registration price.
export async function GET() {
  const settings = await prisma.afaSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });
  return NextResponse.json({ price: settings.price });
}

// POST: create an AFA registration order + Paystack checkout. Works for
// guests too, same pattern as data bundle / PIN checkout.
export async function POST(req: NextRequest) {
  const session = getSession();
  const body = await req.json();
  const { fullName, phoneNumber, idNumber, dateOfBirth, town, occupation, region, cropProduce } = body;

  if (!fullName || !phoneNumber || !idNumber || !dateOfBirth || !town || !occupation || !region) {
    return NextResponse.json({ error: "All fields except crop/produce are required." }, { status: 400 });
  }
  if (!isValidGhanaNumber(phoneNumber)) {
    return NextResponse.json({ error: "Enter a valid 10-digit Ghana number." }, { status: 400 });
  }

  const settings = await prisma.afaSettings.upsert({
    where: { id: "default" },
    create: { id: "default" },
    update: {},
  });

  let userId: string | null = null;
  let email: string;

  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    userId = user.id;
    email = user.email;
  } else {
    email = `${phoneNumber}@guest.rancel-datahub.com`;
  }

  const reference = `RDH-AFA-${uuid()}`;

  const order = await prisma.afaOrder.create({
    data: {
      userId,
      guestEmail: userId ? null : email,
      fullName,
      phoneNumber,
      idNumber,
      dateOfBirth,
      town,
      occupation,
      region,
      cropProduce: cropProduce || null,
      amount: settings.price,
      paystackReference: reference,
      paymentStatus: "PENDING",
    },
  });

  try {
    const tx = await initializeTransaction({
      email,
      amountGhs: settings.price,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/track?ref=${reference}`,
      metadata: { orderId: order.id, orderType: "afa" },
    });
    return NextResponse.json({ orderId: order.id, reference, authorizationUrl: tx.authorization_url });
  } catch (err: any) {
    return NextResponse.json(
      { orderId: order.id, reference, error: err.message || "Payment could not be started." },
      { status: 503 }
    );
  }
}
