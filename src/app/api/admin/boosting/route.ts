import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSmmBalance } from "@/lib/smm";

export const dynamic = "force-dynamic";

function requireAdmin() {
  const session = getSession();
  return session && session.role === "ADMIN" ? session : null;
}

export async function GET() {
  if (!requireAdmin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });

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

  // GainRealGrowth is GHS-native, so only markupPct matters here - usdToGhs
  // is a leftover column from before that fix and is intentionally not
  // read/returned, so the admin UI never shows a control that does nothing.
  const settings = await prisma.smmSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });

  return NextResponse.json({
    balance,
    balanceError,
    markupPct: settings.markupPct,
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

// Update the boosting margin. Only markupPct is accepted - usdToGhs is left
// untouched on purpose (unused by the pricing formula since GainRealGrowth
// prices in GHS natively, not USD).
export async function PATCH(req: NextRequest) {
  if (!requireAdmin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { markupPct } = await req.json();
  if (markupPct === undefined || isNaN(Number(markupPct))) {
    return NextResponse.json({ error: "markupPct must be a number." }, { status: 400 });
  }
  const settings = await prisma.smmSettings.upsert({
    where: { id: "default" },
    update: { markupPct: Number(markupPct) },
    create: { id: "default", markupPct: Number(markupPct) },
  });
  return NextResponse.json({ markupPct: settings.markupPct });
}
