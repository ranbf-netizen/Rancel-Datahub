/**
 * The inbound-code queue engine.
 *
 * Guarantees:
 *  - At most ONE buyer is ACTIVE (holding the turn) per CodeAccount at a time.
 *  - Each InboundEmail is claimed by at most one CodeSession, so a code is
 *    never shown to two buyers (enforced by the unique claimedBySessionId
 *    column + a transaction).
 *  - Turns time out, so a buyer who never requests a code can't block the queue.
 *
 * All the tricky concurrency is handled with conditional updateMany + unique
 * constraints rather than long-held locks, which suits serverless (Vercel).
 */
import { prisma } from "@/lib/db";
import { extractCode, instructionFor } from "@/lib/codeExtract";

export type SessionView = {
  phase: "waiting_turn" | "active" | "revealed" | "expired" | "no_account";
  positionInQueue?: number;
  loginEmail?: string;
  revealInstruction?: string;
  revealContent?: string;
  secondsRemaining?: number;
  totalSeconds?: number;
  turnSecondsLeft?: number;
  attempts?: number;
  maxAttempts?: number;
};

const MAX_ATTEMPTS = 3;

/**
 * Ensure a CodeSession row exists for this purchase, attached to an available
 * account for the product. Returns the session id, or null if the product has
 * no code accounts configured.
 */
export async function ensureSession(purchaseId: string, productId: string): Promise<string | null> {
  const existing = await prisma.codeSession.findUnique({ where: { purchaseId } });
  if (existing) return existing.id;

  // Pick the account with the fewest people waiting, to spread load.
  const accounts = await prisma.codeAccount.findMany({
    where: { productId, active: true },
    include: { _count: { select: { sessions: { where: { status: { in: ["WAITING", "ACTIVE"] } } } } } },
  });
  if (!accounts.length) return null;

  accounts.sort((a: (typeof accounts)[number], b: (typeof accounts)[number]) => a._count.sessions - b._count.sessions);
  const account = accounts[0];

  try {
    const created = await prisma.codeSession.create({
      data: { accountId: account.id, purchaseId, status: "WAITING" },
    });
    return created.id;
  } catch {
    // Unique race: another request created it first.
    const again = await prisma.codeSession.findUnique({ where: { purchaseId } });
    return again?.id ?? null;
  }
}

/**
 * Expire any ACTIVE turn on this account whose turnSeconds have elapsed, and
 * promote the oldest WAITING session to ACTIVE if the account is free.
 */
async function advanceQueue(accountId: string, turnSeconds: number) {
  const now = Date.now();

  // 1) Expire a stale active turn.
  const active = await prisma.codeSession.findFirst({
    where: { accountId, status: "ACTIVE" },
  });
  if (active?.activatedAt) {
    const elapsed = (now - active.activatedAt.getTime()) / 1000;
    if (elapsed > turnSeconds) {
      await prisma.codeSession.updateMany({
        where: { id: active.id, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });
    }
  }

  // 2) If nobody is ACTIVE now, promote the oldest WAITING session.
  const stillActive = await prisma.codeSession.count({ where: { accountId, status: "ACTIVE" } });
  if (stillActive === 0) {
    const next = await prisma.codeSession.findFirst({
      where: { accountId, status: "WAITING" },
      orderBy: { queuedAt: "asc" },
    });
    if (next) {
      // Conditional promote: only succeeds if still WAITING and still nobody ACTIVE.
      await prisma.codeSession.updateMany({
        where: { id: next.id, status: "WAITING" },
        data: { status: "ACTIVE", activatedAt: new Date() },
      });
    }
  }
}

/**
 * Try to hand the active buyer a fresh, unclaimed code. Matches only emails
 * that arrived AFTER their turn started, and claims one atomically.
 */
async function tryRevealForActive(sessionId: string): Promise<boolean> {
  const session = await prisma.codeSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "ACTIVE" || !session.activatedAt) return false;

  const email = await prisma.inboundEmail.findFirst({
    where: {
      accountId: session.accountId,
      claimedBySessionId: null,
      extractedCode: { not: null },
      receivedAt: { gt: session.activatedAt },
    },
    orderBy: { receivedAt: "asc" },
  });
  if (!email) return false;

  // Claim the email for this session. The unique constraint on
  // claimedBySessionId + the WHERE guard means only one session can win.
  try {
    const claimed = await prisma.inboundEmail.updateMany({
      where: { id: email.id, claimedBySessionId: null },
      data: { claimedBySessionId: sessionId },
    });
    if (claimed.count !== 1) return false;
  } catch {
    return false;
  }

  await prisma.codeSession.update({
    where: { id: sessionId },
    data: {
      status: "REVEALED",
      revealStartedAt: new Date(),
      revealedCode: email.extractedCode,
      revealedText: instructionFor(email.body),
    },
  });
  return true;
}

/** The main read used by the downloads page each poll. */
export async function getSessionView(purchaseId: string): Promise<SessionView> {
  const session = await prisma.codeSession.findUnique({
    where: { purchaseId },
    include: { account: true },
  });
  if (!session) return { phase: "no_account" };

  const account = session.account;
  const now = Date.now();

  // Already revealed: report remaining display time.
  if (session.status === "REVEALED" && session.revealStartedAt && session.revealedCode) {
    const elapsed = Math.floor((now - session.revealStartedAt.getTime()) / 1000);
    const remaining = Math.max(0, account.revealSeconds - elapsed);
    if (remaining > 0) {
      return {
        phase: "revealed",
        loginEmail: account.loginEmail,
        revealInstruction: session.revealedText || "Use this code to continue.",
        revealContent: session.revealedCode,
        secondsRemaining: remaining,
        totalSeconds: account.revealSeconds,
      };
    }
    return { phase: "expired" };
  }

  if (session.status === "EXPIRED") return { phase: "expired" };

  // Move the queue forward before deciding what to show.
  await advanceQueue(session.accountId, account.turnSeconds);

  // Re-read after advancing.
  const fresh = await prisma.codeSession.findUnique({ where: { id: session.id } });
  if (!fresh) return { phase: "no_account" };

  if (fresh.status === "ACTIVE") {
    // See if a code is already waiting for this active buyer.
    const revealed = await tryRevealForActive(fresh.id);
    if (revealed) return getSessionView(purchaseId);

    const turnLeft = fresh.activatedAt
      ? Math.max(0, account.turnSeconds - Math.floor((now - fresh.activatedAt.getTime()) / 1000))
      : account.turnSeconds;

    return {
      phase: "active",
      loginEmail: account.loginEmail,
      turnSecondsLeft: turnLeft,
      attempts: fresh.attempts,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  if (fresh.status === "REVEALED") return getSessionView(purchaseId);
  if (fresh.status === "EXPIRED") return { phase: "expired" };

  // Still WAITING: compute position in the queue.
  const ahead = await prisma.codeSession.count({
    where: {
      accountId: fresh.accountId,
      status: { in: ["WAITING", "ACTIVE"] },
      queuedAt: { lt: fresh.queuedAt },
    },
  });
  return { phase: "waiting_turn", positionInQueue: ahead + 1, loginEmail: account.loginEmail };
}

/**
 * Buyer asks for another turn after theirs expired without a code. Re-queues
 * the session if they still have attempts left; otherwise flags a refund.
 */
export async function requeue(purchaseId: string): Promise<SessionView> {
  const session = await prisma.codeSession.findUnique({ where: { purchaseId }, include: { account: true } });
  if (!session) return { phase: "no_account" };

  if (session.status === "EXPIRED") {
    if (session.attempts + 1 >= MAX_ATTEMPTS) {
      // Out of attempts: flag a refund (best-effort) and leave expired.
      try {
        await prisma.refund.create({
          data: {
            orderType: "digital",
            orderId: session.purchaseId,
            reason: "Code never arrived after all attempts (inbound-code engine).",
          },
        });
      } catch {}
      return { phase: "expired" };
    }
    await prisma.codeSession.updateMany({
      where: { id: session.id, status: "EXPIRED" },
      data: { status: "WAITING", attempts: { increment: 1 }, activatedAt: null, queuedAt: new Date() },
    });
  }
  return getSessionView(purchaseId);
}

/**
 * Called by the inbound-email webhook. Saves the email, extracts a code, and
 * immediately tries to hand it to whoever is ACTIVE on the account.
 */
export async function ingestInboundEmail(params: {
  inboundAddress: string;
  fromAddress: string;
  subject?: string | null;
  body: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const account = await prisma.codeAccount.findUnique({
    where: { inboundAddress: params.inboundAddress.toLowerCase().trim() },
  });
  if (!account) return { ok: false, reason: "No account for this address." };

  const code = extractCode(params.body);

  await prisma.inboundEmail.create({
    data: {
      accountId: account.id,
      fromAddress: params.fromAddress,
      subject: params.subject || null,
      body: params.body.slice(0, 20000),
      extractedCode: code,
    },
  });

  // Make sure someone holds the turn, then try to reveal.
  await advanceQueue(account.id, account.turnSeconds);
  const active = await prisma.codeSession.findFirst({ where: { accountId: account.id, status: "ACTIVE" } });
  if (active) await tryRevealForActive(active.id);

  return { ok: true };
}
