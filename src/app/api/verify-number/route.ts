import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const ACTIVATION_HOURS = 72;

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

// Public: checks a number's status against our own delivery history.
//   "new"        - never had a successful delivery, must buy a 1GB activation order first
//   "activating" - bought the 1GB activation order, still within the 72h window
//   "verified"   - past the activation window with at least one successful delivery
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
    return NextResponse.json({ status: "new", phone });
  }

  const hoursSince = (Date.now() - new Date(firstDelivered.createdAt).getTime()) / (1000 * 60 * 60);

  if (hoursSince < ACTIVATION_HOURS) {
    const hoursRemaining = Math.ceil(ACTIVATION_HOURS - hoursSince);
    return NextResponse.json({ status: "activating", phone, hoursRemaining });
  }

  return NextResponse.json({ status: "verified", phone });
}
