import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { ref } = await req.json();
  if (!ref) return NextResponse.json({ error: "Missing reference." }, { status: 400 });

  const purchase = await prisma.digitalPurchase.findUnique({ where: { paystackReference: ref }, include: { product: true } });
  if (!purchase) return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  if (purchase.paymentStatus !== "PAID") return NextResponse.json({ error: "Payment not confirmed yet." }, { status: 400 });
  if (purchase.product.deliveryType !== "GMAIL_LATEST") return NextResponse.json({ error: "Not applicable to this product." }, { status: 400 });

  // Setting confirmedAt again (e.g. buyer clicks "try again" after a
  // timeout) intentionally moves the cutoff forward, so any email that
  // arrived during the earlier failed wait still won't be shown as if it
  // were fresh - only something that arrives after THIS click counts.
  await prisma.digitalPurchase.update({ where: { id: purchase.id }, data: { confirmedAt: new Date() } });

  return NextResponse.json({ ok: true });
}
