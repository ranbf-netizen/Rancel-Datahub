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
 * 4. New email arrives
 *    -> cache the email and start reveal countdown
 *
 * 5. Countdown expires
 *    -> email is no longer returned
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
   * Customer confirmed, but the Gmail message has not
   * been revealed yet.
   *
   * We only check Gmail until we find an email that arrived
   * AFTER confirmedAt.
   */
  if (!purchase.revealStartedAt) {
    let result: {
      found: boolean;
      text: string | null;
    };

    try {
      result = await getLatestGmailTextAfter(
        purchase.product.gmailLabel,
        purchase.confirmedAt.getTime()
      );
    } catch (err: any) {
      return NextResponse.json(
        {
          status: "error",
          message:
            err?.message ||
            "Could not check for your code right now.",
        },
        { status: 502 }
      );
    }

    /**
     * No new email yet.
     */
    if (!result.found) {
      const waitedSeconds =
        (now.getTime() - purchase.confirmedAt.getTime()) / 1000;

      /**
       * Five-minute waiting period has ended.
       */
      if (waitedSeconds >= WAIT_WINDOW_SECONDS) {
        return NextResponse.json({
          status: "paid",
          title: purchase.product.title,
          deliveryType: "GMAIL_LATEST",
          phase: "wait_timed_out",
        });
      }

      /**
       * Still waiting.
       */
      return NextResponse.json({
        status: "paid",
        title: purchase.product.title,
        deliveryType: "GMAIL_LATEST",
        phase: "waiting",
      });
    }

    /**
     * STEP 3
     *
     * A genuinely NEW email has arrived.
     *
     * Cache its contents in the purchase record and start
     * the reveal timer.
     */
    purchase = await prisma.digitalPurchase.update({
      where: { id: purchase.id },
      data: {
        revealStartedAt: now,
        revealedGmailText: result.text,
      },
      include: {
        product: true,
      },
    });
  }

  /**
   * STEP 4
   *
   * Calculate when the reveal expires.
   *
   * The server is authoritative here.
   */
  const expiresAt = new Date(
    purchase.revealStartedAt.getTime() +
      windowSeconds * 1000
  );

  const secondsRemaining = Math.max(
    0,
    Math.ceil(
      (expiresAt.getTime() - now.getTime()) / 1000
    )
  );

  /**
   * STEP 5
   *
   * Reveal window has expired.
   *
   * Do NOT return the cached Gmail text anymore.
   */
  if (secondsRemaining <= 0) {
    return NextResponse.json({
      status: "paid",
      title: purchase.product.title,
      deliveryType: "GMAIL_LATEST",
      phase: "expired",
      revealContent: null,
      secondsRemaining: 0,
      totalSeconds: windowSeconds,
      expired: true,
    });
  }

  /**
   * STEP 6
   *
   * Return the cached email while the reveal window
   * is still active.
   */
  return NextResponse.json({
    status: "paid",
    title: purchase.product.title,
    deliveryType: "GMAIL_LATEST",
    phase: "revealed",

    revealContent: purchase.revealedGmailText,

    // Current countdown value.
    secondsRemaining,

    // Needed by the frontend countdown ring.
    totalSeconds: windowSeconds,

    expired: false,
  });
}