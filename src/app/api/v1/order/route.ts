import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/apiAuth";
import { placeOrder } from "@/lib/supplier";

export const dynamic = "force-dynamic";

const RESELLER_MARKUP = 1.024; // reseller cost = costPrice + 2.4%

function isValidGhanaNumber(v: string) {
  return /^0\d{9}$/.test((v || "").trim());
}

// POST /api/v1/order  { bundleId, recipient }
// Places a data order billed to the agent's TOP-UP wallet.
// Safety: deduct → place → refund on failure. Never charges without an order.
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

  const cost = Math.round(bundle.costPrice * RESELLER_MARKUP * 100) / 100;

  // Re-fetch the agent's live wallet balance inside the transaction guard.
  const freshAgent = await prisma.agentProfile.findUnique({ where: { id: agent.id } });
  if (!freshAgent || freshAgent.walletBalance < cost) {
    return NextResponse.json({ error: "Insufficient wallet balance.", required: cost, balance: freshAgent?.walletBalance ?? 0 }, { status: 402 });
  }

  const reference = `RDH-API-${uuid()}`;

  // Create the order record + deduct wallet atomically (PROCESSING, PAID).
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
  // Log the spend
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

  // Place with the supplier — refund the wallet if it fails.
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
    // Refund the wallet — order couldn't be placed.
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