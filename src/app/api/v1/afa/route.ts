import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/apiAuth";
import { submitAfaRegistration } from "@/lib/supplier";

export const dynamic = "force-dynamic";

function isValidGhanaNumber(v: string) {
  return /^0\d{9}$/.test((v || "").trim());
}

// POST /api/v1/afa  { fullName, phoneNumber, idNumber, dateOfBirth, town, occupation, region, cropProduce? }
// Submits an AFA registration billed to the agent's TOP-UP wallet.
export async function POST(req: Request) {
  const agent = await authenticateApiKey(req);
  if (!agent) return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { fullName, phoneNumber, idNumber, dateOfBirth, town, occupation, region, cropProduce } = body;

  if (!fullName || !phoneNumber || !idNumber || !dateOfBirth || !town || !occupation || !region) {
    return NextResponse.json({ error: "All fields except cropProduce are required." }, { status: 400 });
  }
  if (!isValidGhanaNumber(phoneNumber)) {
    return NextResponse.json({ error: "phoneNumber must be a valid 10-digit Ghana number." }, { status: 400 });
  }

  const settings = await prisma.afaSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });
  const cost = settings.price;

  const freshAgent = await prisma.agentProfile.findUnique({ where: { id: agent.id } });
  if (!freshAgent || freshAgent.walletBalance < cost) {
    return NextResponse.json({ error: "Insufficient wallet balance.", required: cost, balance: freshAgent?.walletBalance ?? 0 }, { status: 402 });
  }

  const reference = `RDH-API-AFA-${uuid()}`;

  const order = await prisma.afaOrder.create({
    data: {
      userId: freshAgent.userId,
      fullName, phoneNumber, idNumber, dateOfBirth, town, occupation, region,
      cropProduce: cropProduce || null,
      amount: cost,
      paystackReference: reference,
      paymentStatus: "PAID",
    },
  });
  await prisma.agentProfile.update({ where: { id: agent.id }, data: { walletBalance: { decrement: cost } } });
  await prisma.agentTransaction.create({
    data: { agentId: agent.id, type: "SALE", amount: -cost, status: "COMPLETED", description: `API AFA — ${fullName}`, paystackReference: reference },
  }).catch(() => {});

  try {
    const result = await submitAfaRegistration({ fullName, phoneNumber, idNumber, dateOfBirth, town, occupation, region, cropProduce });
    await prisma.afaOrder.update({ where: { id: order.id }, data: { supplierId: result.supplierId, supplierStatus: result.status } });
    return NextResponse.json({ orderId: order.id, reference, status: "submitted", charged: cost });
  } catch (err: any) {
    await prisma.agentProfile.update({ where: { id: agent.id }, data: { walletBalance: { increment: cost } } });
    await prisma.afaOrder.update({ where: { id: order.id }, data: { failureReason: err.message } });
    await prisma.agentTransaction.create({
      data: { agentId: agent.id, type: "SALE", amount: cost, status: "COMPLETED", description: `API AFA refund — ${err.message}` },
    }).catch(() => {});
    return NextResponse.json({ error: "AFA submission failed. Your wallet was not charged.", detail: err.message }, { status: 502 });
  }
}