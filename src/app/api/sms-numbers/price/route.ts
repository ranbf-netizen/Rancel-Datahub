import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSmsPoolPrice } from "@/lib/smspool";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });

  const countryId = req.nextUrl.searchParams.get("country");
  const serviceId = req.nextUrl.searchParams.get("service");
  if (!countryId || !serviceId) return NextResponse.json({ error: "country and service are required." }, { status: 400 });

  // Reuses the same USD->GHS + markup settings your SMM boosting already uses -
  // it's the same conversion problem, no need for a second settings table.
  const settings = await prisma.smmSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });

  try {
    const usd = await getSmsPoolPrice(countryId, serviceId);
    const amount = Math.round(usd * settings.usdToGhs * (1 + settings.markupPct / 100) * 100) / 100;
    return NextResponse.json({ amount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not price this number right now." }, { status: 502 });
  }
}
