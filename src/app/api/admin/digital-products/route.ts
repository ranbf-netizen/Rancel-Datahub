import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
function admin() { const s = getSession(); return s && s.role === "ADMIN" ? s : null; }

export async function GET() {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const products = await prisma.digitalProduct.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json();
  const { title, description, instructions, category, price, fileUrl, coverUrl, deliveryType, revealContent, gmailLabel, gmailRevealSeconds, productType, stock, platform, quantity, deliveryEstimate, requirements, featured, instantDelivery, smmServiceId, smmQuantity, optionsJson, deliveryMethods, requireWhatsapp } = body;

  if (!title || price === undefined) {
    return NextResponse.json({ error: "Title and price are required." }, { status: 400 });
  }

  const pType = productType === "BOOSTING" ? "BOOSTING" : "DIGITAL";
  const DELIVERY_TYPES = ["DOWNLOAD", "LINK", "REVEAL", "GMAIL_LATEST", "MANUAL"];
  

  // Validation depends on product type.
  if (pType === "BOOSTING") {
    if (!platform) return NextResponse.json({ error: "Platform is required for a boosting product." }, { status: 400 });
  } else {
    const type = DELIVERY_TYPES.includes(deliveryType) ? deliveryType : "DOWNLOAD";
    if (type === "REVEAL" && !revealContent) {
      return NextResponse.json({ error: "Reveal content is required for a 'Reveal' product." }, { status: 400 });
    }
    if (type !== "REVEAL" && type !== "GMAIL_LATEST" && type !== "MANUAL" && !fileUrl) {
  return NextResponse.json({ error: "A file/link URL is required for Download and Link products." }, { status: 400 });
}
  }

  const stockVal = stock === "" || stock === undefined || stock === null ? null : Number(stock);

  const product = await prisma.digitalProduct.create({
    data: {
      title,
      description: description || null,
      instructions: instructions || null,
      category: category || null,
      price: Number(price),
      productType: pType,
      stock: stockVal,
      coverUrl: coverUrl || null,
      optionsJson: optionsJson || null,
      deliveryMethods: deliveryMethods || "DIGITAL",
      requireWhatsapp: !!requireWhatsapp,
      featured: !!featured,
      instantDelivery: !!instantDelivery,
      // digital-only fields
      fileUrl: pType === "DIGITAL" ? (fileUrl || "") : "",
      deliveryType: pType === "DIGITAL" ? (DELIVERY_TYPES.includes(deliveryType) ? deliveryType : "DOWNLOAD") : "DOWNLOAD",
      revealContent: pType === "DIGITAL" && deliveryType === "REVEAL" ? revealContent : null,
      gmailLabel: pType === "DIGITAL" && deliveryType === "GMAIL_LATEST" ? (gmailLabel || null) : null,
      gmailRevealSeconds: pType === "DIGITAL" && deliveryType === "GMAIL_LATEST" && gmailRevealSeconds ? Number(gmailRevealSeconds) : 60,
      // boosting-only fields
      platform: pType === "BOOSTING" ? platform : null,
      quantity: pType === "BOOSTING" ? (quantity || null) : null,
      deliveryEstimate: pType === "BOOSTING" ? (deliveryEstimate || null) : null,
      requirements: pType === "BOOSTING" ? (requirements || null) : null,
      smmServiceId: pType === "BOOSTING" && smmServiceId ? Number(smmServiceId) : null,
      smmQuantity: pType === "BOOSTING" && smmQuantity ? Number(smmQuantity) : null,
    },
  });
  return NextResponse.json(product);
}

export async function PATCH(req: NextRequest) {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { id, ...fields } = await req.json();
  const data: any = {};
  ["title", "description", "instructions", "category", "fileUrl", "coverUrl", "deliveryType", "platform", "quantity", "deliveryEstimate", "requirements", "revealContent", "gmailLabel", "optionsJson", "deliveryMethods"].forEach((k) => { if (fields[k] !== undefined) data[k] = fields[k]; });
  if (fields.requireWhatsapp !== undefined) data.requireWhatsapp = !!fields.requireWhatsapp;
  if (fields.gmailRevealSeconds !== undefined) data.gmailRevealSeconds = fields.gmailRevealSeconds === "" || fields.gmailRevealSeconds === null ? 60 : Number(fields.gmailRevealSeconds);
  if (fields.price !== undefined) data.price = Number(fields.price);
  if (fields.active !== undefined) data.active = fields.active;
  if (fields.featured !== undefined) data.featured = !!fields.featured;
  if (fields.instantDelivery !== undefined) data.instantDelivery = !!fields.instantDelivery;
  if (fields.featured !== undefined) data.featured = fields.featured;
  if (fields.stock !== undefined) data.stock = fields.stock === "" || fields.stock === null ? null : Number(fields.stock);
  if (fields.smmServiceId !== undefined) data.smmServiceId = fields.smmServiceId === "" || fields.smmServiceId === null ? null : Number(fields.smmServiceId);
  if (fields.smmQuantity !== undefined) data.smmQuantity = fields.smmQuantity === "" || fields.smmQuantity === null ? null : Number(fields.smmQuantity);
  const product = await prisma.digitalProduct.update({ where: { id }, data });
  return NextResponse.json(product);
}

export async function DELETE(req: NextRequest) {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { id } = await req.json();
  // Products with purchases can't be hard-deleted (it would break purchase
  // history). Try a hard delete for products never bought; otherwise soft-delete
  // by marking inactive so it disappears from the shop.
  const purchaseCount = await prisma.digitalPurchase.count({ where: { productId: id } });
  if (purchaseCount > 0) {
    await prisma.digitalProduct.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ ok: true, softDeleted: true });
  }
  await prisma.digitalProduct.delete({ where: { id } });
  return NextResponse.json({ ok: true, softDeleted: false });
}
