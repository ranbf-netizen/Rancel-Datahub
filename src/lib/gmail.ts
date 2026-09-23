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
   * We look for the OTP close to common verification phrases.
   *
   * Supported examples:
   *
   * "Your verification code is 123456"
   * "Verification code: 123456"
   * "Your security code is ABC123"
   * "Sign-in code: 123456"
   * "Use 123456 to sign in"
   * "Enter 123456 to continue"
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
 * Check for a NEW Gmail email received after `afterMs`.
 *
 * Possible results:
 *
 * 1. no_new_email
 *    No email has arrived after the customer's confirmation time.
 *
 * 2. code_not_found
 *    A new email arrived, but no recognizable OTP/code was found.
 *
 * 3. found
 *    A new email arrived and a recognizable OTP/code was found.
 *
 * Only the extracted instruction and OTP/code are returned.
 *
 * The full Gmail message is NEVER returned by this function.
 */
export async function getLatestGmailTextAfter(
  label: string | null | undefined,
  afterMs: number
): Promise<{
  found: boolean;
  instruction: string | null;
  text: string | null;
  reason?: "no_new_email" | "code_not_found";
}> {
  const gmail = getGmailClient();

  const q = label ? `label:${label}` : "";

  /**
   * Request several messages instead of only one.
   *
   * This allows us to ignore a newer irrelevant email and
   * continue looking for another newly received email that
   * contains the actual verification code.
   */
  const list = await gmail.users.messages.list({
    userId: "me",
    maxResults: 10,
    q,
  });

  const messages = list.data.messages;

  if (!messages || messages.length === 0) {
    return {
      found: false,
      instruction: null,
      text: null,
      reason: "no_new_email",
    };
  }

  /**
   * Track whether at least one genuinely new email exists.
   */
  let newestNewEmailFound = false;

  for (const message of messages) {
    const messageId = message.id;

    if (!messageId) {
      continue;
    }

    const msg = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    /**
     * Gmail internalDate is the time Gmail received the message,
     * expressed in milliseconds since Unix epoch.
     */
    const internalDate = Number(msg.data.internalDate);

    if (!internalDate) {
      continue;
    }

