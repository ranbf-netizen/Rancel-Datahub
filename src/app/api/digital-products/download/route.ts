
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLatestGmailTextAfter } from "@/lib/gmail";

export const dynamic = "force-dynamic";

// How long we wait for a NEW Gmail email after the customer confirms
// that they have requested the sign-in code.
const WAIT_WINDOW_SECONDS = 300;

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("ref");

  if (!reference) {
    return NextResponse.json(
      { error: "Missing reference." },
      { status: 400 }
    );
  }

  const purchase = await prisma.digitalPurchase.findUnique({
    where: { paystackReference: reference },
    include: { product: true },
  });

  if (!purchase) {
    return NextResponse.json(
      { error: "Purchase not found." },
      { status: 404 }
    );
  }

  if (purchase.paymentStatus !== "PAID") {
    return NextResponse.json({
      status: "pending",
      message: "Payment not confirmed yet. Refresh in a moment.",
    });
  }

  // Gmail latest-email delivery
  if (purchase.product.deliveryType === "GMAIL_LATEST") {
    return handleGmailReveal(purchase);
  }

  // Normal digital delivery
  return NextResponse.json({
    status: "paid",
    title: purchase.product.title,
    fileUrl: purchase.product.fileUrl,
    deliveryType: purchase.product.deliveryType,
    revealContent:
      purchase.product.deliveryType === "REVEAL"
        ? purchase.product.revealContent
        : null,
  });
}

/**
 * Handles the complete GMAIL_LATEST flow.
 *
 * Flow:
 *
 * 1. Customer has not confirmed yet
 *    -> show Gmail address + checkbox
 *
 * 2. Customer confirms
 *    -> backend starts checking for a NEW email
 *
 * 3. No email yet
 *    -> frontend keeps polling
 *
 * 4. New email arrives with a code
 *    -> cache instruction + code and start reveal countdown
 *
 * 5. Countdown expires
 *    -> instruction + code are no longer returned
 *
 * 6. Five-minute waiting period expires
 *    -> customer gets "Try again"
 */
async function handleGmailReveal(purchase: any) {
  const windowSeconds = purchase.product.gmailRevealSeconds || 60;
  const now = new Date();

  /**
   * STEP 1
   *
   * Customer has not yet confirmed that they requested
   * the sign-in code.
   */
  if (!purchase.confirmedAt) {
    return NextResponse.json({
      status: "paid",
      title: purchase.product.title,
      deliveryType: "GMAIL_LATEST",
      phase: "awaiting_confirmation",

      // Gmail address configured for this product.
      gmailAddress: purchase.product.gmailAddress || null,
    });
  }

