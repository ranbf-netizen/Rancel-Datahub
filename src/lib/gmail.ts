import { google } from "googleapis";

/**
 * Gmail helper for GMAIL_LATEST digital products.
 *
 * Server-side only.
 *
 * The Gmail account is controlled by the site owner.
 * Customers never access Gmail directly.
 *
 * GMAIL_LATEST only returns a recognized OTP/code and a short
 * instruction from a newly received email.
 *
 * It does NOT return the full email.
 */

function getGmailClient() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    throw new Error(
      "Gmail is not configured yet. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI and GMAIL_REFRESH_TOKEN."
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return google.gmail({
    version: "v1",
    auth: oauth2Client,
  });
}

/**
 * Gmail API uses base64url encoding.
 * Convert it safely into normal UTF-8 text.
 */
function decodeBase64(data: string): string {
  const normalized = data
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );

  return Buffer.from(padded, "base64").toString("utf8");
}

/**
 * Extract plain text from a Gmail message payload.
 */
function extractText(payload: any): string | null {
  if (!payload) return null;

  // Prefer plain text.
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  // Search message parts.
  if (Array.isArray(payload.parts)) {
    // First look for a direct plain-text part.
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64(part.body.data);
      }
    }

    // Then search nested parts recursively.
    for (const part of payload.parts) {
      const nested = extractText(part);

      if (nested) {
        return nested;
      }
    }
  }

  // Fallback for a simple non-multipart message.
  if (payload.body?.data) {
    return decodeBase64(payload.body.data);
  }

  return null;
}

/**
 * Result returned after analyzing an email.
 */
function extractOtpData(text: string): {
  code: string | null;
  instruction: string | null;
} {
  const normalizedText = text
    .replace(/\r/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  /**
   * Look for OTPs close to common verification phrases.
   */
  const codePatterns = [
    /(?:your\s+)?(?:verification|security|sign[\s-]?in|login|confirmation)\s+code\s+(?:is\s+)?[:\-]?\s*([A-Z0-9]{4,12})\b/i,

    /(?:your\s+)?(?:verification|security|sign[\s-]?in|login|confirmation)\s+code\s*[:\-]\s*([A-Z0-9]{4,12})\b/i,

    /\bOTP\s+(?:is\s+)?[:\-]?\s*([A-Z0-9]{4,12})\b/i,

    /\bone[-\s]?time\s+password\s*(?:is\s+)?[:\-]?\s*([A-Z0-9]{4,12})\b/i,

    /\b(?:use|enter|type|input)\s+([A-Z0-9]{4,12})\s+(?:to\s+)?(?:sign\s*in|login|log\s*in|verify|continue)\b/i,
  ];

  let code: string | null = null;

  for (const pattern of codePatterns) {
    const match = normalizedText.match(pattern);

    if (match?.[1]) {
      code = match[1].trim();
      break;
    }
  }

  if (!code) {
    return {
      code: null,
      instruction: null,
    };
  }

  /**
   * Build a short customer-facing instruction.
   *
   * We intentionally do not return the entire email.
   */
  let instruction =
    "Use this code to complete your sign-in or verification.";

  if (/sign[\s-]?in|login|log\s*in/i.test(normalizedText)) {
    instruction = "Use this code to sign in.";
  } else if (/verify|verification/i.test(normalizedText)) {
    instruction = "Use this code to verify your account.";
  } else if (/confirm|confirmation/i.test(normalizedText)) {
    instruction = "Use this code to confirm your request.";
  }

  return {
    code,
    instruction,
  };
}

/**
 * Get the latest Gmail email.
 *
 * Kept for compatibility with other parts of the project.
 *
 * IMPORTANT:
 * GMAIL_LATEST does NOT use this function to reveal content
 * to customers.
 */
export async function getLatestGmailText(
  label?: string | null
): Promise<string> {
  const gmail = getGmailClient();

  const q = label ? `label:${label}` : "";

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: 1,
    q,
  });

  const messages = list.data.messages;

  if (!messages || messages.length === 0) {
    return "(No instructions email found.)";
  }

  const messageId = messages[0].id;

  if (!messageId) {
    return "(Could not identify the email.)";
  }

  const msg = await gmail.users.messages.get({
    userId: "me",
    id: messageId,
    format: "full",
  });

  return (
    extractText(msg.data.payload)?.trim() ||
    "(Could not read email body.)"
  );
}

/**
 * Find the FIRST matching Gmail code received after `afterMs`.
 *
 * This is the function used by the one-time GMAIL_LATEST delivery flow.
 *
 * IMPORTANT:
 * - `afterMs` should be captured immediately before the system
 *   starts waiting for the customer's new code.
 * - Older emails are ignored.
 * - Messages are sorted by Gmail's received timestamp.
 * - The EARLIEST matching new code is returned.
 * - Only the code and short instruction are returned.
 * - The full email is NEVER returned.
 */
export async function getFirstGmailCodeAfter(
  label: string | null | undefined,
  afterMs: number
): Promise<{
  found: boolean;
  instruction: string | null;
  text: string | null;
}> {
  const gmail = getGmailClient();

  const q = label ? `label:${label}` : "";

  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: 20,
    q,
  });

  const messages = list.data.messages;

  if (!messages || messages.length === 0) {
    return {
      found: false,
      instruction: null,
      text: null,
    };
  }

  /**
   * First collect the received timestamps.
   *
   * Gmail normally returns messages newest-first, but we do NOT
   * rely on that ordering. We explicitly sort by internalDate.
   */
  const candidates: {
    id: string;
    internalDate: number;
  }[] = [];

  for (const message of messages) {
    if (!message.id) continue;

    const msg = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "metadata",
    });

    const internalDate = Number(msg.data.internalDate);

    if (!internalDate) continue;

    /**
     * Ignore anything that was already in Gmail before this
     * customer's one-time check started.
     */
    if (internalDate <= afterMs) continue;

    candidates.push({
      id: message.id,
      internalDate,
    });
  }

  /**
   * Earliest newly-arrived email first.
   */
  candidates.sort((a, b) => a.internalDate - b.internalDate);

  /**
   * Now inspect the new messages in chronological order.
   *
   * This guarantees that if several new emails arrived,
   * we return the FIRST one containing a recognizable code.
   */
  for (const candidate of candidates) {
  const msg = await gmail.users.messages.get({
    userId: "me",
    id: candidate.id,
    format: "full",
  });

  const emailText =
    extractText(msg.data.payload)?.trim() || "";

  if (!emailText) continue;

  return {
    found: true,
    instruction: "Latest email received",
    text: emailText,
  };
}

  return {
    found: false,
    instruction: null,
    text: null,
  };
}