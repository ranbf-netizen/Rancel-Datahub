import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSmmServices } from "@/lib/smm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });

  const settings = await prisma.smmSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
  const rate = settings.usdToGhs;
  const markup = 1 + settings.markupPct / 100;

  let services: any[] = [];
  try { services = await getSmmServices(); } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not load services." }, { status: 502 });
  }

  // Map each service: convert USD rate/1000 to a GHS rate/1000 with markup.
  const mapped = services.map((s: any) => {
    const usdPer1000 = Number(s.rate) || 0;
    const ghsPer1000 = Math.round(usdPer1000 * rate * markup * 100) / 100;
    return {
      service: Number(s.service),
      name: String(s.name),
      category: String(s.category || "Other"),
      min: Number(s.min) || 1,
      max: Number(s.max) || 100000,
      ghsPer1000,
      refill: !!s.refill,
    };
  });

  return NextResponse.json({ services: mapped });
}
