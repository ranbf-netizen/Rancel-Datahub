import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSmmBalance } from "@/lib/smm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const orders = await prisma.boostOrder.findMany({
    orderBy: { createdAt: "desc" },
    // no limit - load all orders so pagination reaches the first one
    include: { user: { select: { name: true, email: true, phone: true } } },
  });

  // Panel balance (best-effort — if the key/panel is unavailable, return null).
  let balance: number | null = null;
  let balanceError: string | null = null;
  try {
    const b = await getSmmBalance();
    balance = b.balance;
  } catch (err: any) {
    balanceError = err.message || "Could not fetch balance.";
  }

  return NextResponse.json({
    balance,
    balanceError,
    orders: orders.map((o: any) => ({
      id: o.id,
      customer: o.user?.name || "—",
      email: o.user?.email || "—",
      phone: o.user?.phone || "—",
      serviceName: o.serviceName,
      link: o.link,
      quantity: o.quantity,
      amount: o.amount,
      paymentStatus: o.paymentStatus,
      panelStatus: o.panelStatus,
      panelOrderId: o.panelOrderId,
      createdAt: o.createdAt,
    })),
  });
}
