import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { initializeTransaction } from "@/lib/paystack";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = getSession();
  const { productId, email, socialLink, note, whatsapp, chosenOption, deliveryMethod } = await req.json();
  if (!productId) return NextResponse.json({ error: "Product is required." }, { status: 400 });

  const product = await prisma.digitalProduct.findUnique({ where: { id: productId } });
  if (!product || !product.active) return NextResponse.json({ error: "Product not available." }, { status: 404 });
  if (product.stock !== null && product.stock <= 0) {
    return NextResponse.json({ error: "This product is out of stock." }, { status: 409 });
  }

  if (product.productType === "BOOSTING" && product.smmServiceId && !socialLink) {
    return NextResponse.json({ error: "Please provide the link to boost." }, { status: 400 });
  }

  if (product.requireWhatsapp && !whatsapp) {
    return NextResponse.json({ error: "A WhatsApp number is required for this order." }, { status: 400 });
  }

  // Determine price from the chosen option if the product has options.
  let amount = product.price;
  if (product.optionsJson) {
    try {
      const opts = JSON.parse(product.optionsJson) as { name: string; price: number }[];
      const picked = opts.find((o) => o.name === chosenOption);
      if (picked) amount = picked.price;
    } catch {}
  }

  const buyerEmail = email || (session ? undefined : null);
  if (!session && !email) return NextResponse.json({ error: "Email is required to receive your download." }, { status: 400 });

  const reference = `RDH-DIGI-${uuid()}`;
  await prisma.digitalPurchase.create({
    data: {
      productId: product.id,
      userId: session?.userId ?? null,
      guestEmail: email || null,
      amount,
      paystackReference: reference,
      paymentStatus: "PENDING",
      whatsapp: whatsapp || null,
      chosenOption: chosenOption || null,
      deliveryMethod: deliveryMethod || null,
      socialLink: socialLink || null,
      note: note || null,
    },
  });

  try {
    const tx = await initializeTransaction({
      email: email || `${session?.userId}@user.rancel-datahub.com`,
      amountGhs: amount,
      reference,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/downloads?ref=${reference}`,
      metadata: { orderType: "digital", reference },
    });
    return NextResponse.json({ reference, authorizationUrl: tx.authorization_url });
  } catch (err: any) {
    return NextResponse.json({ reference, error: err.message || "Payment could not be started." }, { status: 502 });
  }
}
