import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const days = Math.max(1, Math.min(365, Number(req.nextUrl.searchParams.get("days") || "7")));
  const since = new Date(Date.now() - days * 86400000);

  const events = await prisma.analyticsEvent.findMany({
    where: { createdAt: { gte: since } },
    select: { type: true, source: true, amount: true },
  });
  type Ev = { type: string; source: string | null; amount: number | null };

  const visits = (events as Ev[]).filter((e) => e.type === "visit").length;
  const productViews = (events as Ev[]).filter((e) => e.type === "product_view").length;
  const checkouts = (events as Ev[]).filter((e) => e.type === "checkout_start").length;
  const saleEvents = (events as Ev[]).filter((e) => e.type === "sale");
  const sales = saleEvents.length;
  const revenue = Math.round(saleEvents.reduce((s: number, e: Ev) => s + (e.amount || 0), 0) * 100) / 100;

  // Sources breakdown (from visit events, which carry the source).
  const sourceCounts: Record<string, number> = {};
  (events as Ev[]).filter((e) => e.type === "visit").forEach((e) => {
    const src = e.source || "direct";
    sourceCounts[src] = (sourceCounts[src] || 0) + 1;
  });
  const sources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).map(([source, count]) => ({ source, count }));

  return NextResponse.json({ days, visits, productViews, checkouts, sales, revenue, sources });
}
