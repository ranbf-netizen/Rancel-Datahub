import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";

// Public: active bundles only, no cost price exposed.
export async function GET() {
  const bundles = await prisma.dataBundle.findMany({
    where: { active: true },
    orderBy: [{ network: "asc" }, { dataSizeGb: "asc" }],
    select: {
      id: true,
      network: true,
      label: true,
      dataSizeGb: true,
      sellingPrice: true,
    },
  });
  return NextResponse.json(bundles);
}
