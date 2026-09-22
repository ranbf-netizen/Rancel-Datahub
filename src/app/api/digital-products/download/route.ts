import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLatestGmailText } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("ref");
  if (!reference) return NextResponse.json({ error: "Missing reference." }, { status: 400 });

  const purchase = await prisma.digitalPurchase.findUnique({
    where: { paystackReference: reference },
    include: { product: true },
  });
  if (!purchase) return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
  if (purchase.paymentStatus !== "PAID") {
    return NextResponse.json({ status: "pending", message: "Payment not confirmed yet. Refresh in a moment." });
  }

  if (purchase.product.deliveryType === "GMAIL_LATEST") {
    return handleGmailReveal(purchase);
  }

  return NextResponse.json({
    status: "paid",
    title: purchase.product.title,
    fileUrl: purchase.product.fileUrl,
    deliveryType: purchase.product.deliveryType,
    revealContent: purchase.product.deliveryType === "REVEAL" ? purchase.product.revealContent : null,
  });
}

// One-time, timed reveal of the latest Gmail email. The buyer never touches
// Gmail directly - this server fetches the text once (on the FIRST call
// after payment), caches it, and starts a countdown. Every call after the
// window closes gets nothing back, even though the purchase row is still
// there - it can't be re-triggered to fetch again.
async function handleGmailReveal(purchase: any) {
  const windowSeconds = purchase.product.gmailRevealSeconds || 60;
  const now = new Date();

  if (!purchase.revealStartedAt) {
    let text: string;
    try {
      text = await getLatestGmailText(purchase.product.gmailLabel);
    } catch (err: any) {
      return NextResponse.json({ status: "error", message: err.message || "Could not fetch instructions right now." }, { status: 502 });
    }
    purchase = await prisma.digitalPurchase.update({
      where: { id: purchase.id },
      data: { revealStartedAt: now, revealedGmailText: text },
      include: { product: true },
    });
  }

  const expiresAt = new Date(purchase.revealStartedAt.getTime() + windowSeconds * 1000);
  const secondsRemaining = Math.max(0, Math.round((expiresAt.getTime() - now.getTime()) / 1000));

  if (secondsRemaining <= 0) {
    return NextResponse.json({
      status: "paid",
      title: purchase.product.title,
      deliveryType: "GMAIL_LATEST",
      revealContent: null,
      expired: true,
    });
  }

  return NextResponse.json({
    status: "paid",
    title: purchase.product.title,
    deliveryType: "GMAIL_LATEST",
    revealContent: purchase.revealedGmailText,
    secondsRemaining,
    expired: false,
  });
}
