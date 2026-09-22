import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public: one product's details for the product detail page.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const p = await prisma.digitalProduct.findUnique({ where: { id: params.id } });
  if (!p || !p.active) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  // related: same category (or same productType), excluding this one, max 4
  const related = await prisma.digitalProduct.findMany({
    where: {
      active: true,
      id: { not: p.id },
      OR: [{ category: p.category ?? undefined }, { productType: p.productType }],
    },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { id: true, title: true, price: true, coverUrl: true, platform: true, productType: true },
  });

  return NextResponse.json({
    product: {
      id: p.id, title: p.title, description: p.description, instructions: p.instructions,
      category: p.category, price: p.price, coverUrl: p.coverUrl, productType: p.productType,
      deliveryType: p.deliveryType, platform: p.platform, quantity: p.quantity,
      optionsJson: p.optionsJson, deliveryMethods: p.deliveryMethods, requireWhatsapp: p.requireWhatsapp,
      deliveryEstimate: p.deliveryEstimate, requirements: p.requirements,
      instantDelivery: p.instantDelivery, featured: p.featured,
      outOfStock: p.stock !== null && p.stock <= 0,
      stock: p.stock,
    },
    related,
  });
}
