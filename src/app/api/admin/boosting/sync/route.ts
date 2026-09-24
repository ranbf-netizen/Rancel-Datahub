import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getBoostOrderStatus } from "@/lib/smm";

export const dynamic = "force-dynamic";
const DONE = ["completed", "canceled", "cancelled", "refunded"];

// Admin on-demand status sync for boost orders (button on the admin boosting page).
export async function POST() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const orders = await prisma.boostOrder.findMany({
    where: { paymentStatus: "PAID", panelOrderId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  let updated = 0;
  for (const o of orders) {
    const current = (o.panelStatus || "").toLowerCase();
    if (DONE.some((d) => current.includes(d))) continue;
    try {
      const s = await getBoostOrderStatus(o.panelOrderId!);
      const newStatus = s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : o.panelStatus;
      if (newStatus && newStatus !== o.panelStatus) {
        await prisma.boostOrder.update({ where: { id: o.id }, data: { panelStatus: newStatus } });
        updated++;
      }
    } catch {}
  }
  return NextResponse.json({ updated });
}
