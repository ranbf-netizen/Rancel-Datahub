import { google } from "googleapis";

/**
 * Gmail helper for GMAIL_LATEST digital products.
 *
 * Server-side only.
 *
 * The Gmail account is controlled by the site owner.
 * Customers never access Gmail directly.
 *
 * GMAIL_LATEST only returns a recognized OTP/code from a
 * newly received email. It does NOT return the full email.
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
 * Extract a recognizable OTP / verification code from email text.
 *
 * We intentionally look for codes near words such as:
 * - verification code
 * - security code
 * - sign-in code
 * - login code
 * - confirmation code
 * - OTP
 * - one-time password
 *
 * This avoids blindly taking the first random number in an email,
 * such as an order number, amount, date, or reference number.
 *
 * Code length is variable: 4-12 alphanumeric characters.
 */
function extractOtpCode(text: string): string | null {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  const codePatterns = [
    // "Your verification code is 123456"
    /(?:verification|security|sign[\s-]?in|login|confirmation)\s+code\s+(?:is\s+)?[:\-]?\s*([A-Z0-9]{4,12})\b/i,

    // "Verification code: 123456"
    /(?:verification|security|sign[\s-]?in|login|confirmation)\s+code\s*[:\-]\s*([A-Z0-9]{4,12})\b/i,

    // "OTP: 123456" / "OTP is 123456"
    /\bOTP\s+(?:is\s+)?[:\-]?\s*([A-Z0-9]{4,12})\b/i,

    // "One-time password: 123456"
    /\bone[-\s]?time\s+password\s*(?:is\s+)?[:\-]\s*([A-Z0-9]{4,12})\b/i,

    // "Use 123456 to sign in"
    /\b(?:use|enter|type)\s+([A-Z0-9]{4,12})\s+(?:to\s+)?(?:sign\s*in|login|log\s*in|verify|continue)\b/i,

    // "Enter this code 123456"
    /\b(?:enter|type|input)\s+(?:this\s+)?(?:code\s+)?([A-Z0-9]{4,12})\b/i,
  ];

  for (const pattern of codePatterns) {
    const match = normalizedText.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Get the latest Gmail email.
 *
 * Kept for compatibility with other parts of the project.
 *
 * IMPORTANT:
 * This function returns the email text because it is a legacy/helper
 * function. GMAIL_LATEST does NOT use this function to reveal content
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
 * Only the OTP/code is returned when found.
 *
 * The full Gmail message is NEVER returned by this function.
 */
export async function getLatestGmailTextAfter(
  label: string | null | undefined,
  afterMs: number
): Promise<{
  found: boolean;
  text: string | null;
  reason?: "no_new_email" | "code_not_found";
}> {
  const gmail = getGmailClient();

  const q = label ? `label:${label}` : "";

  /**
   * Gmail normally returns messages with the newest first.
   *
   * We request a few messages instead of only one so that if the
   * newest message is irrelevant, we can still find the newest
   * qualifying email received after `afterMs`.
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
      text: null,
      reason: "no_new_email",
    };
  }

  /**
   * Check the newest messages first.
   *
   * We keep track of whether a new email exists at all.
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

    /**
     * Ignore messages with an invalid timestamp.
     */
    if (!internalDate) {
      continue;
    }

    /**
     * IMPORTANT:
     *
     * The email must have arrived AFTER the customer confirmed
     * that they requested the code.
     *
     * This prevents an old OTP already sitting in Gmail from
     * being shown to a new customer.
     */
    if (internalDate <= afterMs) {
      continue;
    }

    newestNewEmailFound = true;

    const emailText =
      extractText(msg.data.payload)?.trim() || "";

    /**
     * We have a new email.
     *
     * Now look specifically for an OTP/code.
     */
    const code = extractOtpCode(emailText);

    if (code) {
      return {
        found: true,
        text: code,
      };
    }

    /**
     * This email is new, but it does not contain a recognizable
     * verification/OTP code.
     *
     * Continue checking older NEW emails in case another email
     * arrived shortly after it and contains the actual code.
     */
  }

  /**
   * At least one new email exists, but none of the new emails
   * contained a recognizable OTP.
   */
  if (newestNewEmailFound) {
    return {
      found: false,
      text: null,
      reason: "code_not_found",
    };
  }

  /**
   * No email newer than afterMs was found.
   */
  return {
    found: false,
    text: null,
    reason: "no_new_email",
  };
}