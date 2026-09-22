import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Agent-only: same active bundles as the public list, but INCLUDES costPrice so
// the agent dashboard can compute reseller cost (cost + 2.4%). Guarded by an
// approved-agent session so cost/margin data is never exposed publicly.
export async function GET() {
  const session = getSession();
  if (!session) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const profile = await prisma.agentProfile.findUnique({
    where: { userId: session.userId },
  });
  if (!profile || profile.status !== "APPROVED") {
    return NextResponse.json({ error: "Approved agent account required." }, { status: 403 });
  }

  const bundles = await prisma.dataBundle.findMany({
    where: { active: true },
    orderBy: [{ network: "asc" }, { dataSizeGb: "asc" }],
    select: {
      id: true,
      network: true,
      label: true,
      dataSizeGb: true,
      sellingPrice: true,
      costPrice: true,
      validityDays: true,
    },
  });
  return NextResponse.json(bundles);
}
