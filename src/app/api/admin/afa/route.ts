import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function requireAdmin() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

// GET: list all AFA orders + current price setting.
export async function GET() {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [orders, settings] = await Promise.all([
    prisma.afaOrder.findMany({
      include: { user: true, agent: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.afaSettings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} }),
  ]);

  return NextResponse.json({ orders, price: settings.price });
}

// PATCH: update the AFA registration price.
export async function PATCH(req: NextRequest) {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { price } = await req.json();

  if (!price || price <= 0) {
    return NextResponse.json({ error: "Enter a valid price." }, { status: 400 });
  }

  const settings = await prisma.afaSettings.upsert({
    where: { id: "default" },
    create: { id: "default", price },
    update: { price },
  });

  return NextResponse.json(settings);
}
