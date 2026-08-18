import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";
export const dynamic = "force-dynamic";

// Public: list available exam type/year + price + remaining stock (no serials/pins exposed).
export async function GET() {
  const batches = await prisma.pinBatch.findMany({
    include: { _count: { select: { pins: { where: { status: "AVAILABLE" } } as any } } },
  });

  // Prisma doesn't support filtered counts in _count directly pre-5.x syntax in all versions,
  // so fall back to an explicit count per batch for reliability.
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

// Create a pending pin order + Paystack checkout. Stock is checked here (before payment)
// and re-checked/claimed atomically in the webhook once payment is confirmed.
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { batchId } = await req.json();
  const batch = await prisma.pinBatch.findUnique({ where: { id: batchId } });
  if (!batch) return NextResponse.json({ error: "That exam type/year is not available." }, { status: 404 });

  const available = await prisma.pin.count({ where: { batchId: batch.id, status: "AVAILABLE" } });
  if (available < 1) {
    return NextResponse.json({ error: "Out of stock for that exam type/year." }, { status: 409 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const reference = `RDH-PIN-${uuid()}`;

  const order = await prisma.pinOrder.create({
    data: {
      userId: user.id,
      examType: batch.examType,
      year: batch.year,
      amount: batch.sellingPrice,
      paystackReference: reference,
      paymentStatus: "PENDING",
    },
  });

  try {
    const tx = await initializeTransaction({
      email: user.email,
      amountGhs: batch.sellingPrice,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/orders?ref=${reference}`,
      metadata: { orderId: order.id, orderType: "pin" },
    });
    return NextResponse.json({ orderId: order.id, authorizationUrl: tx.authorization_url });
  } catch (err: any) {
    return NextResponse.json(
      { orderId: order.id, error: err.message || "Payment could not be started." },
      { status: 503 }
    );
  }
}
