import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSmsPoolCountries, getSmsPoolServices } from "@/lib/smspool";

export const dynamic = "force-dynamic";

// SMSPool's country/service lists are large and barely change - cache them
// in memory for a few minutes so we're not hitting their API on every page
// load. Resets on server restart, which is fine for a list this stable.
let cache: { countries: any[]; services: any[]; at: number } | null = null;
const CACHE_MS = 10 * 60 * 1000;

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json({ countries: cache.countries, services: cache.services });
  }

  try {
    const [countries, services] = await Promise.all([getSmsPoolCountries(), getSmsPoolServices()]);
    cache = { countries, services, at: Date.now() };
    return NextResponse.json({ countries, services });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not load SMS number catalog." }, { status: 502 });
  }
}
