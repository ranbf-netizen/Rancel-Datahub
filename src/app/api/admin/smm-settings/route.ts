import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
function admin() { const s = getSession(); return s && s.role === "ADMIN" ? s : null; }

export async function GET() {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const s = await prisma.smmSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  return NextResponse.json(s);
}

export async function PATCH(req: NextRequest) {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { markupPct, usdToGhs } = await req.json();
  const s = await prisma.smmSettings.upsert({
    where: { id: "default" },
    update: {
      ...(markupPct !== undefined ? { markupPct: Number(markupPct) } : {}),
      ...(usdToGhs !== undefined ? { usdToGhs: Number(usdToGhs) } : {}),
    },
    create: { id: "default", markupPct: Number(markupPct) || 30, usdToGhs: Number(usdToGhs) || 14 },
  });
  return NextResponse.json(s);
}
