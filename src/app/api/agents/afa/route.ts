import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { submitAfaRegistration } from "@/lib/supplier";

export const dynamic = "force-dynamic";

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const profile = await prisma.agentProfile.findUnique({ where: { userId: session.userId } });
  if (!profile) return NextResponse.json({ error: "You need an agent account first." }, { status: 403 });

  const [offers, settings] = await Promise.all([
    prisma.afaOrder.findMany({ where: { agentId: profile.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.afaSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} }),
  ]);

  return NextResponse.json({ offers, price: settings.price });
}

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { fullName, phoneNumber, idNumber, dateOfBirth, town, occupation, region, cropProduce } = await req.json();

  if (!fullName || !phoneNumber || !idNumber || !dateOfBirth || !town || !occupation || !region) {
    return NextResponse.json({ error: "All fields except crop/produce are required." }, { status: 400 });
  }
  if (!isValidGhanaNumber(phoneNumber)) {
    return NextResponse.json({ error: "Enter a valid 10-digit Ghana number." }, { status: 400 });
  }

  const profile = await prisma.agentProfile.findUnique({ where: { userId: session.userId } });
  if (!profile || profile.status !== "APPROVED") {
    return NextResponse.json({ error: "You need an approved agent account first." }, { status: 403 });
  }

  const settings = await prisma.afaSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });

  if (profile.walletBalance < settings.price) {
    return NextResponse.json(
      { error: `Insufficient wallet balance. AFA registration costs GH₵ ${settings.price.toFixed(2)}.` },
      { status: 402 }
    );
  }

  const offer = await prisma.$transaction(async (tx: any) => {
    await tx.agentProfile.update({
      where: { id: profile.id },
      data: { walletBalance: { decrement: settings.price } },
    });
    await tx.agentTransaction.create({
      data: { agentId: profile.id, type: "SALE", amount: -settings.price, description: `AFA registration - ${fullName}` },
    });
    return tx.afaOrder.create({
      data: {
        agentId: profile.id,
        fullName, phoneNumber, idNumber, dateOfBirth, town, occupation, region,
        cropProduce: cropProduce || null,
        amount: settings.price,
        paymentStatus: "PAID",
      },
    });
  });

  try {
    const result = await submitAfaRegistration({
      fullName, phoneNumber, idNumber, dateOfBirth, town, occupation, region,
      cropProduce: cropProduce || undefined,
    });
    const updated = await prisma.afaOrder.update({
      where: { id: offer.id },
      data: { supplierId: result.supplierId, supplierStatus: result.status },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    await prisma.$transaction([
      prisma.agentProfile.update({ where: { id: profile.id }, data: { walletBalance: { increment: settings.price } } }),
      prisma.afaOrder.update({ where: { id: offer.id }, data: { failureReason: err.message } }),
      prisma.agentTransaction.create({
        data: { agentId: profile.id, type: "SALE", amount: settings.price, description: "Refund - AFA submission failed" },
      }),
    ]);
    return NextResponse.json({ error: `Submission failed, wallet refunded: ${err.message}` }, { status: 502 });
  }
}
