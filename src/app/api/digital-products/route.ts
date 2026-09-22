import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = await prisma.digitalProduct.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, description: true, instructions: true, category: true, price: true,
      coverUrl: true, deliveryType: true, productType: true, stock: true,
      platform: true, quantity: true, deliveryEstimate: true, requirements: true,
      featured: true, instantDelivery: true,
    },
  });
  // Expose an "outOfStock" flag rather than the raw number logic to the client.
  const withStock = products.map((p: any) => ({
    ...p,
    outOfStock: p.stock !== null && p.stock <= 0,
  }));
  return NextResponse.json(withStock);
}
