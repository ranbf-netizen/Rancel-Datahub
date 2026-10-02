import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/apiAuth";
import { placeOrder } from "@/lib/supplier";

export const dynamic = "force-dynamic";

function isValidGhanaNumber(v: string) {
  return /^0\d{9}$/.test((v || "").trim());
}

// POST /api/v1/order  { bundleId, recipient }
// Places a data order billed to the agent's TOP-UP wallet at their own
// reseller rate (admin-set discountPercent = markup above cost).
// Safety: deduct -> place -> refund on failure.
export async function POST(req: Request) {
  const agent = await authenticateApiKey(req);
  if (!agent) return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { bundleId, recipient } = body;

  if (!bundleId || !recipient) {
    return NextResponse.json({ error: "bundleId and recipient are required." }, { status: 400 });
  }
  if (!isValidGhanaNumber(recipient)) {
    return NextResponse.json({ error: "recipient must be a valid 10-digit Ghana number (e.g. 0241234567)." }, { status: 400 });
  }

  const bundle = await prisma.dataBundle.findUnique({ where: { id: bundleId } });
  if (!bundle || !bundle.active) {
    return NextResponse.json({ error: "Bundle not found or not available." }, { status: 404 });
  }

  // Agent price = cost + the agent's own markup (admin-set discountPercent).
  const cost = Math.round(bundle.costPrice * (1 + agent.discountPercent / 100) * 100) / 100;

  const freshAgent = await prisma.agentProfile.findUnique({ where: { id: agent.id } });
  if (!freshAgent || freshAgent.walletBalance < cost) {
    return NextResponse.json({ error: "Insufficient wallet balance.", required: cost, balance: freshAgent?.walletBalance ?? 0 }, { status: 402 });
  }

  const reference = `RDH-API-${uuid()}`;

  const order = await prisma.dataOrder.create({
    data: {
      userId: freshAgent.userId,
      bundleId: bundle.id,
      beneficiaryNumber: recipient,
      amount: cost,
      paymentStatus: "PAID",
      fulfillmentStatus: "PROCESSING",
      paystackReference: reference,
      referredByAgentId: null,
    },
  });
  await prisma.agentProfile.update({
    where: { id: agent.id },
    data: { walletBalance: { decrement: cost } },
  });
  await prisma.agentTransaction.create({
    data: {
      agentId: agent.id,
      type: "SALE",
      amount: -cost,
      status: "COMPLETED",
      description: `API order — ${bundle.dataSizeGb}GB ${bundle.network} → ${recipient}`,
      paystackReference: reference,
    },
  }).catch(() => {});

  try {
    const result = await placeOrder({
      network: bundle.network as any,
      beneficiary: recipient,
      packageId: bundle.dataSizeGb,
    });
    await prisma.dataOrder.update({
      where: { id: order.id },
      data: { supplierOrderId: result.orderId },
    });
    return NextResponse.json({
      orderId: order.id,
      reference,
      status: "processing",
      bundle: `${bundle.dataSizeGb}GB ${bundle.network}`,
      recipient,
      charged: cost,
    });
  } catch (err: any) {
    await prisma.agentProfile.update({ where: { id: agent.id }, data: { walletBalance: { increment: cost } } });
    await prisma.dataOrder.update({
      where: { id: order.id },
      data: { fulfillmentStatus: "FAILED", failureReason: err.message },
    });
    await prisma.agentTransaction.create({
      data: {
        agentId: agent.id,
        type: "SALE",
        amount: cost,
        status: "COMPLETED",
        description: `API order refund — supplier error: ${err.message}`,
      },
    }).catch(() => {});
    return NextResponse.json({ error: "Order could not be placed. Your wallet was not charged.", detail: err.message }, { status: 502 });
  }
}

// Customer's own API orders.
export async function GET(req: Request) {
  const agent = await authenticateApiKey(req);
  if (!agent) return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });
  const orders = await prisma.dataOrder.findMany({
    where: { userId: agent.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { bundle: true },
  });
  return NextResponse.json({
    orders: orders.map((o: any) => ({
      orderId: o.id,
      bundle: `${o.bundle.dataSizeGb}GB ${o.bundle.network}`,
      recipient: o.beneficiaryNumber,
      charged: o.amount,
      status: o.fulfillmentStatus === "DELIVERED" ? "delivered" : o.fulfillmentStatus === "FAILED" ? "failed" : "processing",
      createdAt: o.createdAt,
    })),
  });
}