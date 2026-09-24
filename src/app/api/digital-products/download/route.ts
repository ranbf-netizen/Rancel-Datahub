import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFirstGmailCodeAfter } from "@/lib/gmail";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("ref");
  const checkCode = req.nextUrl.searchParams.get("checkCode") === "1";

  if (!reference) {
    return NextResponse.json(
      { error: "Missing reference." },
      { status: 400 }
    );
  }

  try {
    const purchase = await prisma.digitalPurchase.findUnique({
      where: {
        paystackReference: reference,
      },
      include: {
        product: true,
      },
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

    // -----------------------------------------
    // GMAIL LATEST
    // -----------------------------------------
    if (purchase.product.deliveryType === "GMAIL_LATEST") {
      return handleGmailDelivery(purchase, checkCode);
    }

    // -----------------------------------------
    // NORMAL DIGITAL PRODUCT
    // -----------------------------------------
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
  } catch (error: any) {
    console.error("DOWNLOAD ERROR:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Something went wrong while loading your purchase.",
      },
      { status: 500 }
    );
  }
}

async function handleGmailDelivery(
  purchase: any,
  checkCode: boolean
) {
  const product = purchase.product;
  const windowSeconds = product.gmailRevealSeconds || 60;

  // -----------------------------------------
  // Just opening the page
  // -----------------------------------------
  if (!checkCode) {
    return NextResponse.json({
      status: "paid",
      title: product.title,
      deliveryType: "GMAIL_LATEST",
      gmailAddress: product.gmailAddress || null,
      phase: purchase.confirmedAt ? "checked" : "ready",
    });
  }

  // -----------------------------------------
  // ONE-TIME CHECK
  // -----------------------------------------
  //
  // confirmedAt is now used as the permanent
  // "this purchase has already used its Gmail check"
  // marker.
  //
  // Once this is set, this purchase can NEVER perform
  // another Gmail check.
  //
  if (purchase.confirmedAt) {
    // If a code was already successfully revealed,
    // allow the customer to see that saved code while
    // its display window is still active.
    if (purchase.revealStartedAt && purchase.revealedGmailText) {
      const elapsedSeconds = Math.floor(
        (Date.now() - purchase.revealStartedAt.getTime()) / 1000
      );

      const secondsRemaining = Math.max(
        0,
        windowSeconds - elapsedSeconds
      );

      if (secondsRemaining > 0) {
        return NextResponse.json({
          status: "paid",
          title: product.title,
          deliveryType: "GMAIL_LATEST",
          gmailAddress: product.gmailAddress || null,
          phase: "revealed",
          revealInstruction:
            purchase.revealedGmailInstruction ||
            "Use this code to complete your sign-in.",
          revealContent: purchase.revealedGmailText,
          secondsRemaining,
          totalSeconds: windowSeconds,
        });
      }
    }

    return NextResponse.json({
      status: "paid",
      title: product.title,
      deliveryType: "GMAIL_LATEST",
      gmailAddress: product.gmailAddress || null,
      phase: "already_checked",
      message:
        "This purchase has already used its one-time code check.",
    });
  }

  // -----------------------------------------
  // Record the exact moment this customer
  // started their one-time code check.
  // -----------------------------------------
  const checkStartedAt = Date.now();

  // -----------------------------------------
  // Claim the one-time check atomically.
  //
  // This prevents two simultaneous requests from
  // both getting a Gmail check for the same purchase.
  // -----------------------------------------
  const claimed = await prisma.digitalPurchase.updateMany({
    where: {
      id: purchase.id,
      confirmedAt: null,
    },
    data: {
      confirmedAt: new Date(checkStartedAt),
    },
  });

  if (claimed.count !== 1) {
    return NextResponse.json({
      status: "paid",
      title: product.title,
      deliveryType: "GMAIL_LATEST",
      gmailAddress: product.gmailAddress || null,
      phase: "already_checked",
      message:
        "This purchase has already used its one-time code check.",
    });
  }

  // -----------------------------------------
  // Wait for the new Gmail code.
  //
  // The customer only gets ONE attempt, but the
  // server gives Gmail some time for Netflix's
  // email to arrive.
  //
  // Maximum wait: 45 seconds.
  // -----------------------------------------
  const maxWaitMs = 45_000;
  const pollIntervalMs = 3_000;

  const deadline = Date.now() + maxWaitMs;

  let result: {
    found: boolean;
    instruction: string | null;
    text: string | null;
  } = {
    found: false,
    instruction: null,
    text: null,
  };

  while (Date.now() < deadline) {
    result = await getFirstGmailCodeAfter(
      product.gmailLabel || undefined,
      checkStartedAt
    );

    if (result.found && result.text) {
      break;
    }

    await sleep(pollIntervalMs);
  }

  // -----------------------------------------
  // No matching code arrived during the
  // one-time checking window.
  //
  // IMPORTANT:
  // confirmedAt remains set.
  // The customer cannot try again with this
  // purchase.
  // -----------------------------------------
  if (!result.found || !result.text) {
    return NextResponse.json({
      status: "paid",
      title: product.title,
      deliveryType: "GMAIL_LATEST",
      gmailAddress: product.gmailAddress || null,
      phase: "not_found",
      message:
        "The verification code could not be retrieved during this one-time check. Please contact support.",
    });
  }

  // -----------------------------------------
  // Code found.
  // Save it against this purchase.
  // -----------------------------------------
  const revealStartedAt = new Date();

  await prisma.digitalPurchase.update({
    where: {
      id: purchase.id,
    },
    data: {
      revealStartedAt,
      revealedGmailInstruction:
        result.instruction ||
        "Use this code to complete your sign-in.",
      revealedGmailText: result.text,
    },
  });

  return NextResponse.json({
    status: "paid",
    title: product.title,
    deliveryType: "GMAIL_LATEST",
    gmailAddress: product.gmailAddress || null,
    phase: "revealed",
    revealInstruction:
      result.instruction ||
      "Use this code to complete your sign-in.",
    revealContent: result.text,
    secondsRemaining: windowSeconds,
    totalSeconds: windowSeconds,
  });
}

/**
 * Small delay used while waiting for Gmail to receive
 * the Netflix verification email.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}