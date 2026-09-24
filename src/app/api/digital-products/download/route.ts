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

  /**
   * STEP 2
   *
   * Customer has confirmed.
   *
   * If a code has already been revealed, return the cached
   * code while the server-side reveal window is still active.
   */
  if (purchase.revealStartedAt) {
    const elapsedSeconds = Math.floor(
      (now.getTime() - purchase.revealStartedAt.getTime()) / 1000
    );

    const secondsRemaining = Math.max(
      0,
      windowSeconds - elapsedSeconds
    );

    if (
      secondsRemaining > 0 &&
      purchase.revealedGmailText
    ) {
      return NextResponse.json({
        status: "paid",
        title: purchase.product.title,
        deliveryType: "GMAIL_LATEST",
        phase: "revealed",
        revealInstruction:
          purchase.revealedGmailInstruction ||
          "Use this code to complete your sign-in or verification.",
        revealContent: purchase.revealedGmailText,
        secondsRemaining,
        totalSeconds: windowSeconds,
        expired: false,
      });
    }

    // Reveal window has expired.
    return NextResponse.json({
      status: "paid",
      title: purchase.product.title,
      deliveryType: "GMAIL_LATEST",
      phase: "expired",
      revealInstruction: null,
      revealContent: null,
      secondsRemaining: 0,
      totalSeconds: windowSeconds,
      expired: true,
    });
  }

  /**
   * STEP 3
   *
   * We have a confirmedAt timestamp but have not found
   * a qualifying new email yet.
   */
  const waitedSeconds = Math.floor(
    (now.getTime() - purchase.confirmedAt.getTime()) / 1000
  );

  // Five-minute waiting window has expired.
  if (waitedSeconds >= WAIT_WINDOW_SECONDS) {
    return NextResponse.json({
      status: "paid",
      title: purchase.product.title,
      deliveryType: "GMAIL_LATEST",
      phase: "wait_timed_out",
      message: "No new code arrived.",
      gmailAddress: purchase.product.gmailAddress || null,
      secondsRemaining: 0,
    });
  }

  /**
   * STEP 4
   *
   * Check Gmail only for emails received AFTER confirmedAt.
   */
  const result = await getLatestGmailTextAfter(
    purchase.product.gmailLabel || undefined,
    purchase.confirmedAt.getTime()
  );

  /**
   * STEP 5
   *
   * No qualifying email has arrived yet.
   */
  if (!result.found) {
    return NextResponse.json({
      status: "paid",
      title: purchase.product.title,
      deliveryType: "GMAIL_LATEST",
      phase:
        result.reason === "code_not_found"
          ? "code_not_found"
          : "waiting",
      message:
        result.reason === "code_not_found"
          ? "A new email arrived, but no verification code was found."
          : "Waiting for a new code.",
      gmailAddress: purchase.product.gmailAddress || null,
      secondsRemaining: Math.max(
        0,
        WAIT_WINDOW_SECONDS - waitedSeconds
      ),
    });
  }

  /**
   * STEP 6
   *
   * A valid OTP/code was found.
   *
   * Cache it so repeated polling does not keep fetching
   * Gmail or replace the code during the reveal window.
   */
  const revealStartedAt = now;

  await prisma.digitalPurchase.update({
    where: { id: purchase.id },
    data: {
      revealStartedAt,
      revealedGmailInstruction:
        result.instruction ||
        "Use this code to complete your sign-in or verification.",
      revealedGmailText: result.text,
    },
  });

  return NextResponse.json({
    status: "paid",
    title: purchase.product.title,
    deliveryType: "GMAIL_LATEST",
    phase: "revealed",
    revealInstruction:
      result.instruction ||
      "Use this code to complete your sign-in or verification.",
    revealContent: result.text,
    secondsRemaining: windowSeconds,
    totalSeconds: windowSeconds,
    expired: false,
  });
}
