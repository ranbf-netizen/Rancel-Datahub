// Catches the two most common ways people mistype an email at signup:
// 1. Genuinely malformed (missing @, no dot, stray spaces)
// 2. A near-miss on a well-known domain (.con instead of .com, gmial.com,
//    yahooo.com, etc.) - these PASS basic format checks, so they'd otherwise
//    sail through registration and quietly break things later (e.g. the
//    Paystack "Invalid Email Address Passed" error this was built to prevent).
//
// Use on both the client (inline "did you mean...?" hint as they type) and
// the server (hard reject on signup - never trust client-side validation
// alone).

const COMMON_DOMAINS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "live.com", "aol.com", "protonmail.com",
];

const COMMON_TLD_TYPOS: Record<string, string> = {
  con: "com", cmo: "com", vom: "com", xom: "com", comm: "com", co: "com",
  nte: "net", ne: "net", og: "org", ogr: "org",
};

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export type EmailCheck =
  | { valid: true; suggestion: null }
  | { valid: true; suggestion: string } // looks real but probably a typo - warn, don't block
  | { valid: false; suggestion: null };  // genuinely malformed - block

export function checkEmail(raw: string): EmailCheck {
  const email = raw.trim().toLowerCase();
  const basicShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!basicShape.test(email)) {
    return { valid: false, suggestion: null };
  }

  const [local, domain] = email.split("@");
  const domainParts = domain.split(".");
  const tld = domainParts[domainParts.length - 1];
  const domainName = domainParts.slice(0, -1).join(".");

  // Known bad TLD (gmail.con -> gmail.com)
  if (COMMON_TLD_TYPOS[tld]) {
    return { valid: true, suggestion: `${local}@${domainName}.${COMMON_TLD_TYPOS[tld]}` };
  }

  // Close-but-not-quite match on a well-known domain (gmial.com -> gmail.com)
  for (const known of COMMON_DOMAINS) {
    if (domain === known) break; // exact match, nothing to suggest
    const distance = levenshtein(domain, known);
    if (distance > 0 && distance <= 2) {
      return { valid: true, suggestion: `${local}@${known}` };
    }
  }

  return { valid: true, suggestion: null };
}
