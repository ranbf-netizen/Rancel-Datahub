import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirstGmailCodeAfter } from "@/lib/gmail";
import { ensureSession, getSessionView, requeue } from "@/lib/codeQueue";

export const dynamic = "force-dynamic";

// How long one "attempt" keeps polling for a fresh code before giving up.
// This used to be a single blocking 45-second wait inside one request -
// risky on serverless hosts (Vercel kills long-running functions), and too
// short for emails that take a minute or more. Now each request does ONE
// quick Gmail check and returns immediately; the FRONTEND polls this route
// every few seconds, so the effective wait time (this constant) can safely
// be much longer without ever risking a platform timeout.
const WAIT_WINDOW_SECONDS = 180;

// A buyer gets this many total attempts (first check + retries) before the
// purchase is permanently done. Bounded so nobody can hammer this endpoint
// indefinitely fishing for a code, but generous enough that one mistimed or
// slow email doesn't strand a paying customer.
const MAX_ATTEMPTS = 3;

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("ref");
  const checkCode = req.nextUrl.searchParams.get("checkCode") === "1";
  const retry = req.nextUrl.searchParams.get("retry") === "1";

  if (!reference) {
    return NextResponse.json({ error: "Missing reference." }, { status: 400 });
  }

  try {
    const purchase = await prisma.digitalPurchase.findUnique({
      where: { paystackReference: reference },
      include: { product: true },
    });

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found." }, { status: 404 });
    }

    if (purchase.paymentStatus !== "PAID") {
      return NextResponse.json({
        status: "pending",
        message: "Payment not confirmed yet. Refresh in a moment.",
      });
    }

    if (purchase.product.deliveryType === "INBOUND_CODE") {
      return handleInboundCodeDelivery(purchase, retry);
    }

    if (purchase.product.deliveryType === "GMAIL_LATEST") {
      return handleGmailDelivery(purchase, checkCode, retry);
    }

    return NextResponse.json({
      status: "paid",
      title: purchase.product.title,
      fileUrl: purchase.product.fileUrl,
      deliveryType: purchase.product.deliveryType,
      accessNote: purchase.product.accessNote || null,
      revealContent: purchase.product.deliveryType === "REVEAL" ? purchase.product.revealContent : null,
    });
  } catch (error: any) {
    console.error("DOWNLOAD ERROR:", error);
    return NextResponse.json(
      { error: error?.message || "Something went wrong while loading your purchase." },
      { status: 500 }
    );
  }
}

// New inbound-code engine: buyer is queued per account, each code goes to
// exactly one person, codes arrive by email (no Gmail polling).
async function handleInboundCodeDelivery(purchase: any, retry: boolean) {
  const product = purchase.product;

  // Make sure this purchase has a queue session on an available account.
  const sessionId = await ensureSession(purchase.id, product.id);
  if (!sessionId) {
    return NextResponse.json({
      status: "paid",
      title: product.title,
      deliveryType: "INBOUND_CODE",
      phase: "no_account",
    });
  }

  const view = retry ? await requeue(purchase.id) : await getSessionView(purchase.id);

  return NextResponse.json({
    status: "paid",
    title: product.title,
    deliveryType: "INBOUND_CODE",
    loginEmail: view.loginEmail || null,
    phase: view.phase,
    positionInQueue: view.positionInQueue,
    revealInstruction: view.revealInstruction,
    revealContent: view.revealContent,
    secondsRemaining: view.secondsRemaining,
    totalSeconds: view.totalSeconds,
    turnSecondsLeft: view.turnSecondsLeft,
    attemptsRemaining:
      typeof view.attempts === "number" && typeof view.maxAttempts === "number"
        ? view.maxAttempts - view.attempts
        : undefined,
  });
}

async function handleGmailDelivery(purchase: any, checkCode: boolean, retry: boolean) {
  const product = purchase.product;
  const windowSeconds = product.gmailRevealSeconds || 60;

  // Just opening the page - quick summary, no Gmail call.
  if (!checkCode) {
    return NextResponse.json({
      status: "paid",
      title: product.title,
      deliveryType: "GMAIL_LATEST",
      gmailAddress: product.gmailAddress || null,
      phase: purchase.confirmedAt ? "checking" : "ready",
    });
  }

  // A code was already found on a previous poll - just report its remaining
  // display time. Terminal state, ignores retry.
  if (purchase.revealStartedAt && purchase.revealedGmailText) {
    const elapsedSeconds = Math.floor((Date.now() - purchase.revealStartedAt.getTime()) / 1000);
    const secondsRemaining = Math.max(0, windowSeconds - elapsedSeconds);
    if (secondsRemaining > 0) {
      return NextResponse.json({
        status: "paid",
        title: product.title,
        deliveryType: "GMAIL_LATEST",
        gmailAddress: product.gmailAddress || null,
        phase: "revealed",
        revealInstruction: purchase.revealedGmailInstruction || "Use this code to complete your sign-in.",
        revealContent: purchase.revealedGmailText,
        secondsRemaining,
        totalSeconds: windowSeconds,
      });
    }
    return NextResponse.json({
      status: "paid",
      title: product.title,
      deliveryType: "GMAIL_LATEST",
      gmailAddress: product.gmailAddress || null,
      phase: "expired",
    });
  }

  const now = Date.now();

  // First attempt ever for this purchase: claim it atomically so two
  // simultaneous requests can't both start a fresh cutoff.
  if (!purchase.confirmedAt) {
    if (purchase.checkAttempts >= MAX_ATTEMPTS) {
      return NextResponse.json({
        status: "paid", title: product.title, deliveryType: "GMAIL_LATEST",
        gmailAddress: product.gmailAddress || null, phase: "not_found_final",
      });
    }
    const claimed = await prisma.digitalPurchase.updateMany({
      where: { id: purchase.id, confirmedAt: null },
      data: { confirmedAt: new Date(now), checkAttempts: { increment: 1 } },
    });
    if (claimed.count === 1) {
      purchase.confirmedAt = new Date(now);
      purchase.checkAttempts += 1;
    } else {
      // Lost the race to another request for the same purchase - re-read
      // the row so we act on whatever actually got committed.
      const fresh = await prisma.digitalPurchase.findUnique({ where: { id: purchase.id } });
      if (fresh) Object.assign(purchase, fresh);
    }
  } else if (retry) {
    // Explicit "try again" - only allowed once the previous attempt's
    // window has genuinely run out, nothing was ever revealed, and there
    // are attempts left.
    const windowOverMs = now - new Date(purchase.confirmedAt).getTime();
    const canRetry = windowOverMs > WAIT_WINDOW_SECONDS * 1000 && purchase.checkAttempts < MAX_ATTEMPTS && !purchase.revealStartedAt;
    if (canRetry) {
      const claimed = await prisma.digitalPurchase.updateMany({
        where: { id: purchase.id, revealStartedAt: null, checkAttempts: { lt: MAX_ATTEMPTS } },
        data: { confirmedAt: new Date(now), checkAttempts: { increment: 1 } },
      });
      if (claimed.count === 1) {
        purchase.confirmedAt = new Date(now);
        purchase.checkAttempts += 1;
      }
    }
  }
  // Otherwise: this is just a routine poll against the existing cutoff -
  // nothing to claim, fall through to checking Gmail below.

  const cutoffMs = new Date(purchase.confirmedAt).getTime();
  const elapsedSeconds = (now - cutoffMs) / 1000;

  let result: { found: boolean; instruction: string | null; text: string | null };
  try {
    result = await getFirstGmailCodeAfter(product.gmailLabel || undefined, cutoffMs);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Could not check for your code right now." },
      { status: 502 }
    );
  }

  if (result.found && result.text) {
    const revealStartedAt = new Date();
    await prisma.digitalPurchase.update({
      where: { id: purchase.id },
      data: {
        revealStartedAt,
        revealedGmailInstruction: result.instruction || "Use this code to complete your sign-in.",
        revealedGmailText: result.text,
      },
    });
    return NextResponse.json({
      status: "paid",
      title: product.title,
      deliveryType: "GMAIL_LATEST",
      gmailAddress: product.gmailAddress || null,
      phase: "revealed",
      revealInstruction: result.instruction || "Use this code to complete your sign-in.",
      revealContent: result.text,
      secondsRemaining: windowSeconds,
      totalSeconds: windowSeconds,
    });
  }

  if (elapsedSeconds > WAIT_WINDOW_SECONDS) {
    const attemptsRemaining = MAX_ATTEMPTS - purchase.checkAttempts;
    return NextResponse.json({
      status: "paid",
      title: product.title,
      deliveryType: "GMAIL_LATEST",
      gmailAddress: product.gmailAddress || null,
      phase: attemptsRemaining > 0 ? "not_found" : "not_found_final",
      attemptsRemaining,
    });
  }

  return NextResponse.json({
    status: "paid",
    title: product.title,
    deliveryType: "GMAIL_LATEST",
    gmailAddress: product.gmailAddress || null,
    phase: "waiting",
    secondsWaited: Math.floor(elapsedSeconds),
    maxWaitSeconds: WAIT_WINDOW_SECONDS,
  });
}
