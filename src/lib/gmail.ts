import { google } from "googleapis";

/**
 * Reads the latest email from YOUR Gmail (server-side only, via a one-time
 * authorized refresh token). Used by GMAIL_LATEST digital products so a
 * buyer can be shown your latest instructions without ever touching Gmail
 * or your inbox directly - this function returns only plain text, nothing
 * else about the inbox.
 *
 * Set GMAIL_LABEL-per-product (product.gmailLabel) to restrict which email
 * counts as "latest" - strongly recommended. Without it, this returns the
 * single latest email in the entire inbox.
 */
export async function getLatestGmailText(label?: string | null): Promise<string> {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !redirectUri || !refreshToken) {
    throw new Error(
      "Gmail is not configured yet. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI and GMAIL_REFRESH_TOKEN before selling a GMAIL_LATEST product."
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const q = label ? `label:${label}` : "";
  const list = await gmail.users.messages.list({ userId: "me", maxResults: 1, q });

  const messages = list.data.messages;
  if (!messages || messages.length === 0) {
    return "(No instructions email found.)";
  }

  const msg = await gmail.users.messages.get({ userId: "me", id: messages[0].id!, format: "full" });

  function extractText(payload: any): string | null {
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === "text/plain" && part.body?.data) {
          return Buffer.from(part.body.data, "base64").toString("utf8");
        }
      }
      for (const part of payload.parts) {
        const nested = extractText(part);
        if (nested) return nested;
      }
    } else if (payload.body?.data) {
      return Buffer.from(payload.body.data, "base64").toString("utf8");
    }
    return null;
  }

  return extractText(msg.data.payload) || "(Could not read email body.)";
}
