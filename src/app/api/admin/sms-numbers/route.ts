import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSmsPoolBalance } from "@/lib/smspool";

export const dynamic = "force-dynamic";

function admin() {
  const s = getSession();
  return s && s.role === "ADMIN" ? s : null;
}

// Only PAID orders - a pending/abandoned checkout never became a real order,
// so it has no business showing up in the admin orders table either.
export async function GET() {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const orders = await prisma.smsOrder.findMany({
    where: { paymentStatus: "PAID" },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, email: true, phone: true } } },
  });

  const settings = await prisma.smsPoolSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });

  // Panel balance (best-effort - if the key/panel is unavailable, return null).
  let balance: number | null = null;
  let balanceError: string | null = null;
  try {
    balance = await getSmsPoolBalance();
  } catch (err: any) {
    balanceError = err.message || "Could not fetch balance.";
  }

  return NextResponse.json({
    balance,
    balanceError,
    settings,
    orders: orders.map((o: any) => ({
      id: o.id,
      customer: o.user?.name || "—",
      phone: o.user?.phone || "—",
      countryName: o.countryName,
      serviceName: o.serviceName,
      phoneNumber: o.phoneNumber,
      smsCode: o.smsCode,
      amount: o.amount,
      paymentStatus: o.paymentStatus,
      status: o.status,
      createdAt: o.createdAt,
    })),
  });
}

export async function PATCH(req: NextRequest) {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { markupPct, usdToGhs } = await req.json();
  const s = await prisma.smsPoolSettings.upsert({
    where: { id: "default" },
    update: {
      ...(markupPct !== undefined ? { markupPct: Number(markupPct) } : {}),
      ...(usdToGhs !== undefined ? { usdToGhs: Number(usdToGhs) } : {}),
    },
    create: { id: "default", markupPct: Number(markupPct) || 40, usdToGhs: Number(usdToGhs) || 14 },
  });
  return NextResponse.json(s);
}
