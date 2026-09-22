import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getOrderStatus } from "@/lib/supplier";
import { resolveDataOrderDelivery } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

// Manually asks the supplier directly "did you actually deliver this order?" - for when
// their completion webhook never arrived (or our endpoint had a hiccup) and the
// order is stuck showing PROCESSING even though it may have genuinely delivered.
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { orderId } = await req.json();
  const order = await prisma.dataOrder.findUnique({ where: { id: orderId } });

  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (!order.supplierOrderId) {
    return NextResponse.json({ error: "This order was never placed with the supplier yet." }, { status: 400 });
  }

  try {
    const status = await getOrderStatus(order.supplierOrderId);

    if (status.orderStatus === "completed") {
      await resolveDataOrderDelivery(order.supplierOrderId, "DELIVERED");
    } else if (status.orderStatus === "failed" || status.orderStatus === "refunded") {
      await resolveDataOrderDelivery(order.supplierOrderId, "FAILED", `Supplier status: ${status.orderStatus}`);
    }

    return NextResponse.json({ supplierStatus: status.orderStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not reach the supplier." }, { status: 503 });
  }
}
