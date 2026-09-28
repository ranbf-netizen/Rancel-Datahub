import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getOrderStatus } from "@/lib/supplier";
import { resolveDataOrderDelivery } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

// Resolves a batch of stuck (PAID + PROCESSING) orders by checking each one's
// real status with the supplier — same logic as the single "Check delivery",
// just looped over a batch so 100+ stuck orders can be cleared accurately.
const BATCH = 20;

export async function POST() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stuck = await prisma.dataOrder.findMany({
    where: {
      paymentStatus: "PAID",
      fulfillmentStatus: "PROCESSING",
      supplierOrderId: { not: null },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
  });

  let delivered = 0;
  let failed = 0;
  let stillPending = 0;
  let errors = 0;

  for (const order of stuck) {
    try {
      const status = await getOrderStatus(order.supplierOrderId!);
      if (status.orderStatus === "completed") {
        await resolveDataOrderDelivery(order.supplierOrderId!, "DELIVERED");
        delivered++;
      } else if (status.orderStatus === "failed" || status.orderStatus === "refunded") {
        await resolveDataOrderDelivery(order.supplierOrderId!, "FAILED", `Supplier status: ${status.orderStatus}`);
        failed++;
      } else {
        stillPending++;
      }
    } catch {
      errors++;
    }
  }

  // How many are still stuck after this batch.
  const remaining = await prisma.dataOrder.count({
    where: { paymentStatus: "PAID", fulfillmentStatus: "PROCESSING", supplierOrderId: { not: null } },
  });

  return NextResponse.json({ checked: stuck.length, delivered, failed, stillPending, errors, remaining });
}