import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

// Public: list available exam type/year + price + remaining stock (no serials/pins exposed).
export async function GET() {
  const batches = await prisma.pinBatch.findMany();

  const withStock = await Promise.all(
    batches.map(async (b: (typeof batches)[number]) => {
      const available = await prisma.pin.count({ where: { batchId: b.id, status: "AVAILABLE" } });
      return {
        id: b.id,
        examType: b.examType,
        year: b.year,
        sellingPrice: b.sellingPrice,
        available,
      };
    })
  );

  return NextResponse.json(withStock.filter((b) => b.available > 0));
}

// Create a pending pin order + Paystack checkout. Works for logged-in customers AND
// guests (guests must provide a phone number, used later for public order tracking).
// Stock is checked here (before payment) and re-checked/claimed atomically once paid.
export async function POST(req: NextRequest) {
  const session = getSession();
  const { batchId, guestPhone } = await req.json();

  const batch = await prisma.pinBatch.findUnique({ where: { id: batchId } });
  if (!batch) return NextResponse.json({ error: "That exam type/year is not available." }, { status: 404 });

  const available = await prisma.pin.count({ where: { batchId: batch.id, status: "AVAILABLE" } });
  if (available < 1) {
    return NextResponse.json({ error: "Out of stock for that exam type/year." }, { status: 409 });
  }

  let userId: string | null = null;
  let email: string;

  if (session) {
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    userId = user.id;
    email = user.email;
  } else {
    if (!guestPhone || !isValidGhanaNumber(guestPhone)) {
      return NextResponse.json(
        { error: "Enter a valid 10-digit Ghana number so you can track this order later." },
        { status: 400 }
      );
    }
    email = `${guestPhone}@guest.rancel-datahub.com`;
  }

  const reference = `RDH-PIN-${uuid()}`;

  const order = await prisma.pinOrder.create({
    data: {
      userId,
      guestPhone: userId ? null : guestPhone,
      guestEmail: userId ? null : email,
      examType: batch.examType,
      year: batch.year,
      amount: batch.sellingPrice,
      paystackReference: reference,
      paymentStatus: "PENDING",
    },
  });

  try {
    const tx = await initializeTransaction({
      email,
      amountGhs: batch.sellingPrice,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/track?ref=${reference}`,
      metadata: { orderId: order.id, orderType: "pin" },
    });
    return NextResponse.json({ orderId: order.id, reference, authorizationUrl: tx.authorization_url });
  } catch (err: any) {
    return NextResponse.json(
      { orderId: order.id, reference, error: err.message || "Payment could not be started." },
      { status: 503 }
    );
  }
}
