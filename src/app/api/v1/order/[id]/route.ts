import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

// GET /api/v1/order/{id} — status of an order the agent placed.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const agent = await authenticateApiKey(req);
  if (!agent) return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });

  const order = await prisma.dataOrder.findUnique({
    where: { id: params.id },
    include: { bundle: true },
  });
  // Only let the agent see their own API orders.
  if (!order || order.userId !== agent.userId) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const status =
    order.fulfillmentStatus === "DELIVERED" ? "delivered" :
    order.fulfillmentStatus === "FAILED" ? "failed" : "processing";

  return NextResponse.json({
    orderId: order.id,
    bundle: `${order.bundle.dataSizeGb}GB ${order.bundle.network}`,
    recipient: order.beneficiaryNumber,
    charged: order.amount,
    status,
    createdAt: order.createdAt,
  });
}