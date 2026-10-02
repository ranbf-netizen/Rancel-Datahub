import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

// GET /api/v1/bundles — list data bundles at the authenticated agent's
// reseller price (cost + the agent's own markup = admin-set discountPercent).
export async function GET(req: Request) {
  const agent = await authenticateApiKey(req);
  if (!agent) return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });

  const bundles = await prisma.dataBundle.findMany({
    where: { active: true },
    orderBy: [{ network: "asc" }, { dataSizeGb: "asc" }],
    select: {
      id: true,
      network: true,
      label: true,
      dataSizeGb: true,
      costPrice: true,
      validityDays: true,
    },
  });

  const data = bundles.map((b) => ({
    id: b.id,
    network: b.network,
    label: b.label,
    sizeGb: b.dataSizeGb,
    validityDays: b.validityDays,
    price: Math.round(b.costPrice * (1 + agent.discountPercent / 100) * 100) / 100,
  }));

  return NextResponse.json({ bundles: data });
}