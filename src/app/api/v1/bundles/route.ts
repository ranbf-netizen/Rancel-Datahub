import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

// Public reseller API — list data bundles at the authenticated agent's
// reseller price. Requires a valid API key.
export async function GET(req: Request) {
  const agent = await authenticateApiKey(req);
  if (!agent) return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });

  const bundles = await prisma.dataBundle.findMany({
    where: { active: true },
    orderBy: [{ network: "asc" }, { dataSizeGb: "asc" }],
  });

  // Reseller price = cost + a small margin (using the agent's discountPercent
  // off the retail selling price — same logic your storefront/agent uses).
  const discount = agent.discountPercent ?? 10;

  const data = bundles.map((b: any) => ({
    id: b.id,
    network: b.network,
    sizeGb: b.dataSizeGb,
    validityDays: b.validityDays,
    price: Math.round(b.sellingPrice * (1 - discount / 100) * 100) / 100,
  }));

  return NextResponse.json({ bundles: data });
}