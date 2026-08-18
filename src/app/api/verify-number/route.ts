import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCustomerHistory } from "@/lib/supplier";

export const dynamic = "force-dynamic";

const ACTIVATION_HOURS = 72;

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

// Public: checks a number's real status directly with DataMart (source of truth),
// falling back to our own database only if DataMart's API is temporarily unreachable.
//   "new"        - no completed order on record, must buy a 1GB activation order first
//   "activating" - has a completed order, but still within the 72h window
//   "verified"   - past the activation window with at least one completed delivery
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone")?.trim() || "";

  if (!isValidGhanaNumber(phone)) {
    return NextResponse.json({ error: "Enter a valid 10-digit Ghana number." }, { status: 400 });
  }

  let earliestCompletedAt: Date | null = null;
  let source: "datamart" | "local" = "datamart";

  try {
    const history = await getCustomerHistory(phone);
    const completed = history.filter((o) => o.status === "completed");
    for (const o of completed) {
      const ts = o.completedAt || o.placedAt;
      if (!ts) continue;
      const date = new Date(ts);
      if (!earliestCompletedAt || date < earliestCompletedAt) earliestCompletedAt = date;
    }
  } catch {
    // DataMart unreachable right now - fall back to our own delivery records rather
    // than telling every customer their number is "new" during a supplier hiccup.
    source = "local";
    const firstDelivered = await prisma.dataOrder.findFirst({
      where: { beneficiaryNumber: phone, fulfillmentStatus: "DELIVERED" },
      orderBy: { createdAt: "asc" },
    });
    if (firstDelivered) earliestCompletedAt = firstDelivered.createdAt;
  }

  if (!earliestCompletedAt) {
    return NextResponse.json({ status: "new", phone, source });
  }

  const hoursSince = (Date.now() - earliestCompletedAt.getTime()) / (1000 * 60 * 60);

  if (hoursSince < ACTIVATION_HOURS) {
    const hoursRemaining = Math.ceil(ACTIVATION_HOURS - hoursSince);
    return NextResponse.json({ status: "activating", phone, hoursRemaining, source });
  }

  return NextResponse.json({ status: "verified", phone, source });
}
