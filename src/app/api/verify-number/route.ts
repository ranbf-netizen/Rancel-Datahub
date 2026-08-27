import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ACTIVATION_HOURS = 72;

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

// Cledanet doesn't offer a live "verify this number" or customer-history
// endpoint, so this checks our OWN delivery records instead - a reasonable
// proxy, though it only knows about numbers that have ordered through this
// site before, not a number's history elsewhere.
//   "new"        - no completed order on record, must buy a 1GB activation order first
//   "activating" - has a completed order, but still within the 72h window
//   "verified"   - past the activation window with at least one completed delivery
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone")?.trim() || "";

  if (!isValidGhanaNumber(phone)) {
    return NextResponse.json({ error: "Enter a valid 10-digit Ghana number." }, { status: 400 });
  }

  const firstDelivered = await prisma.dataOrder.findFirst({
    where: { beneficiaryNumber: phone, fulfillmentStatus: "DELIVERED" },
    orderBy: { createdAt: "asc" },
  });

  if (!firstDelivered) {
    return NextResponse.json({
      status: "new",
      phone,
      servable: false,
      recommendation: "activate_first",
      message: "This number hasn't received a delivery from us before.",
    });
  }

  const hoursSince = (Date.now() - firstDelivered.createdAt.getTime()) / (1000 * 60 * 60);

  if (hoursSince < ACTIVATION_HOURS) {
    return NextResponse.json({
      status: "activating",
      phone,
      servable: false,
      recommendation: "activate_first",
      hoursRemaining: Math.ceil(ACTIVATION_HOURS - hoursSince),
      message: "Still within the activation window from a previous order.",
    });
  }

  return NextResponse.json({
    status: "verified",
      phone,
    servable: true,
    recommendation: "sell_any",
    message: "Delivered successfully before.",
  });
}
