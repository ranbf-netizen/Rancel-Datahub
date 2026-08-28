import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: the logged-in user's agent profile + quick stats (or null if they haven't applied).
export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const profile = await prisma.agentProfile.findUnique({ where: { userId: session.userId } });
  if (!profile) return NextResponse.json({ profile: null });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todaySales, allSales, recentTransactions, storeOrders] = await Promise.all([
    prisma.agentSale.findMany({ where: { agentId: profile.id, createdAt: { gte: startOfDay } } }),
    prisma.agentSale.findMany({ where: { agentId: profile.id } }),
    prisma.agentTransaction.findMany({
      where: { agentId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    // Orders customers placed through this agent's storefront link.
    prisma.dataOrder.findMany({
      where: { referredByAgentId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { bundle: { select: { dataSizeGb: true, network: true } } },
    }),
  ]);

  const totalProfit = allSales.reduce((sum: number, s: (typeof allSales)[number]) => sum + s.profit, 0);
  const todayRevenue = todaySales.reduce((sum: number, s: (typeof todaySales)[number]) => sum + s.customerPrice, 0);

  return NextResponse.json({
    profile,
    stats: {
      todaySalesCount: todaySales.length,
      todayRevenue,
      totalProfit,
      totalSalesCount: allSales.length,
    },
    recentTransactions,
    recentSales: allSales.slice(-10).reverse(),
    storeOrders: storeOrders.map((o: any) => ({
      id: o.id,
      dataSizeGb: o.bundle.dataSizeGb,
      network: o.bundle.network,
      beneficiaryNumber: o.beneficiaryNumber,
      amount: o.amount,
      commission: o.agentCommission ?? 0,
      paymentStatus: o.paymentStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      createdAt: o.createdAt,
    })),
  });
}

// POST: apply to become an agent (creates a PENDING profile for admin to review).
export async function POST() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const existing = await prisma.agentProfile.findUnique({ where: { userId: session.userId } });
  if (existing) return NextResponse.json({ error: "You've already applied." }, { status: 409 });

  const profile = await prisma.agentProfile.create({ data: { userId: session.userId } });
  return NextResponse.json(profile);
}
