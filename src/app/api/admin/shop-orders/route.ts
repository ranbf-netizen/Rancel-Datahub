import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const orders = await prisma.digitalPurchase.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { product: { select: { title: true, productType: true, deliveryType: true } } },
  });

  return NextResponse.json({
    orders: orders.map((o: any) => ({
      id: o.id,
      product: o.product?.title || "—",
      productType: o.product?.productType || "DIGITAL",
      deliveryType: o.product?.deliveryType || "",
      email: o.guestEmail || "—",
      whatsapp: o.whatsapp || "",
      option: o.chosenOption || "",
      deliveryMethod: o.deliveryMethod || "",
      note: o.note || "",
      amount: o.amount,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt,
    })),
  });
}
