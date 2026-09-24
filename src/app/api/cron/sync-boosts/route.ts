import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getBoostOrderStatus } from "@/lib/smm";

export const dynamic = "force-dynamic";

// Syncs boost order statuses from the SMM panel. Meant to be called on a
// schedule (cron-job.org), same protection as the main sweep via CRON_SECRET.
// Returns a tiny response (counts only) so cron-job.org never rejects it.
const MAX_PER_RUN = 40;

// Which panel statuses we treat as "finished" and stop polling.
const DONE = ["completed", "canceled", "cancelled", "refunded"];

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Paid boost orders that have a panel order id and aren't finished yet.
  const orders = await prisma.boostOrder.findMany({
    where: {
      paymentStatus: "PAID",
      panelOrderId: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_PER_RUN,
  });

  let checked = 0;
  let updated = 0;

  for (const o of orders) {
    // skip ones already in a final state
    const current = (o.panelStatus || "").toLowerCase();
    if (DONE.some((d) => current.includes(d))) continue;

    checked++;
    try {
      const s = await getBoostOrderStatus(o.panelOrderId!);
      // Title-case-ish for display: keep the panel's word.
      const newStatus = s.status
        ? s.status.charAt(0).toUpperCase() + s.status.slice(1)
        : o.panelStatus;
      if (newStatus && newStatus !== o.panelStatus) {
        await prisma.boostOrder.update({ where: { id: o.id }, data: { panelStatus: newStatus } });
        updated++;
      }
    } catch {
      // leave as-is; try again next run
    }
  }

  return NextResponse.json({ checked, updated });
}
