import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function daysAgo(n: number) {
  return startOfDay(new Date(Date.now() - n * 86400000));
}

export async function GET(_req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  // Optional single-date lookup: ?date=YYYY-MM-DD returns revenue/profit for
  // just that day.
  const dateParam = _req.nextUrl.searchParams.get("date");
  if (dateParam) {
    const dayStart = new Date(`${dateParam}T00:00:00`);
    if (isNaN(dayStart.getTime())) {
      return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    }
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const dayOrders = await prisma.dataOrder.findMany({
      where: { paymentStatus: "PAID", createdAt: { gte: dayStart, lt: dayEnd } },
      include: { bundle: { select: { costPrice: true } } },
    });
    let revenue = 0, profit = 0;
    for (const o of dayOrders) {
      revenue += o.amount;
      profit += o.amount - (o.bundle?.costPrice ?? 0) - (o.agentCommission ?? 0);
    }
    return NextResponse.json({
      date: dateParam,
      revenue: round(revenue),
      profit: round(profit),
      count: dayOrders.length,
    });
  }

  const today = startOfDay();
  const weekStart = daysAgo(6); // last 7 days incl. today
  const monthStart = daysAgo(29);

  // Pull delivered+paid data orders for the last 30 days (with bundle cost) to
  // compute real revenue & profit. Profit = amount - cost - agent commission.
  const paidOrders = await prisma.dataOrder.findMany({
    where: { paymentStatus: "PAID", createdAt: { gte: monthStart } },
    include: { bundle: { select: { costPrice: true } } },
  });

  function summarize(since: Date) {
    let revenue = 0;
    let profit = 0;
    let count = 0;
    for (const o of paidOrders) {
      if (o.createdAt < since) continue;
      count += 1;
      revenue += o.amount;
      profit += o.amount - (o.bundle?.costPrice ?? 0) - (o.agentCommission ?? 0);
    }
    return { revenue: round(revenue), profit: round(profit), count };
  }

  // Per-day revenue & profit for the last 7 days (for the chart).
  const daily: { label: string; revenue: number; profit: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = daysAgo(i);
    const dayEnd = daysAgo(i - 1);
    let revenue = 0;
    let profit = 0;
    for (const o of paidOrders) {
      if (o.createdAt >= dayStart && o.createdAt < dayEnd) {
        revenue += o.amount;
        profit += o.amount - (o.bundle?.costPrice ?? 0) - (o.agentCommission ?? 0);
      }
    }
    daily.push({
      label: dayStart.toLocaleDateString(undefined, { weekday: "short" }),
      revenue: round(revenue),
      profit: round(profit),
    });
  }

  // Needs-attention counts.
  const [stuck, failed, pendingRefunds, pendingWithdrawals] = await Promise.all([
    prisma.dataOrder.count({ where: { paymentStatus: "PAID", fulfillmentStatus: "PROCESSING" } }),
    prisma.dataOrder.count({ where: { fulfillmentStatus: "FAILED" } }),
    prisma.refund.findMany({ where: { status: "pending" } }),
    prisma.agentTransaction.findMany({ where: { type: "WITHDRAWAL", status: "PENDING" } }),
  ]);

  const pendingWithdrawalTotal = pendingWithdrawals.reduce(
    (s: number, t: (typeof pendingWithdrawals)[number]) => s + Math.abs(t.amount),
    0
  );

  // Agent commissions: total paid out to agents via storefront (SALE txns whose
  // description marks them as storefront commission) + count of agents earning.
  const commissionTxns = await prisma.agentTransaction.findMany({
    where: { type: "SALE", description: { startsWith: "Storefront commission" } },
  });
  const totalCommission = commissionTxns.reduce(
    (s: number, t: (typeof commissionTxns)[number]) => s + t.amount,
    0
  );
  const weekCommission = commissionTxns.reduce(
    (s: number, t: (typeof commissionTxns)[number]) => (t.createdAt >= weekStart ? s + t.amount : s),
    0
  );

  return NextResponse.json({
    today: summarize(today),
    week: summarize(weekStart),
    month: summarize(monthStart),
    daily,
    attention: {
      stuck,
      failed,
      pendingRefundCount: pendingRefunds.length,
      pendingWithdrawalCount: pendingWithdrawals.length,
      pendingWithdrawalTotal: round(pendingWithdrawalTotal),
    },
    commission: {
      total: round(totalCommission),
      week: round(weekCommission),
      agentsEarning: new Set(commissionTxns.map((t: (typeof commissionTxns)[number]) => t.agentId)).size,
    },
  });
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
