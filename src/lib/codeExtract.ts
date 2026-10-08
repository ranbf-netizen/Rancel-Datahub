/**
 * Extracts a verification / sign-in code from a plain-text email body.
 *
 * Used by the inbound-code engine. Intentionally conservative: it prefers a
 * code sitting next to a recognised phrase ("your code is", "OTP", etc.), and
 * only falls back to a bare 4-8 digit number if nothing better is found.
 *
 * Returns null when no plausible code is present, so the email can be held for
 * manual admin review instead of showing a buyer something random.
 */
export function extractCode(rawBody: string): string | null {
  if (!rawBody) return null;

  const text = rawBody
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1) Code near a recognised verification phrase (strongest signal).
  const labelled: RegExp[] = [
    /(?:your\s+)?(?:verification|security|sign[\s-]?in|log[\s-]?in|login|confirmation|access|one[\s-]?time)\s+(?:code|password|pin)\s+(?:is\s+)?[:\-]?\s*([A-Z0-9]{4,8})\b/i,
    /\b(?:OTP|code|pin)\s*(?:is\s+)?[:\-]\s*([A-Z0-9]{4,8})\b/i,
    /\b(?:use|enter|type|input)\s+(?:the\s+)?(?:code\s+)?([A-Z0-9]{4,8})\s+(?:to\s+)?(?:sign\s*in|log\s*in|login|verify|continue|confirm)\b/i,
    /\b([0-9]{4,8})\s+is\s+your\b/i,
  ];

  for (const re of labelled) {
    const m = text.match(re);
    if (m?.[1]) return m[1].toUpperCase();
  }

  // 2) Fallback: a standalone 4-8 digit number that looks like a code.
  // Require word boundaries and avoid years / phone-number-like runs.
  const bare = text.match(/\b(\d{4,8})\b/g);
  if (bare && bare.length) {
    // Prefer the first 4-8 digit group that isn't an obvious year.
    const pick = bare.find((n) => {
      const v = Number(n);
      const looksLikeYear = n.length === 4 && v >= 1990 && v <= 2099;
      return !looksLikeYear;
    });
    if (pick) return pick;
  }

  return null;
}

/** Short, buyer-facing instruction based on the email's wording. */
export function instructionFor(rawBody: string): string {
  const t = (rawBody || "").toLowerCase();
  if (/sign[\s-]?in|log[\s-]?in|login/.test(t)) return "Use this code to sign in.";
  if (/verify|verification/.test(t)) return "Use this code to verify.";
  if (/confirm|confirmation/.test(t)) return "Use this code to confirm.";
  return "Use this code to continue.";
}
