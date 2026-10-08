/**
 * Cloudflare Email Worker — forwards incoming emails to your site.
 *
 * When an email arrives at an address you've routed to this worker
 * (e.g. netflix1@ranceldatahub.shop), Cloudflare runs this worker. It reads the
 * plain-text body and POSTs it to your site's /api/inbound-email route, which
 * matches it to the buyer whose turn it is.
 *
 * ---------------------------------------------------------------------------
 * SETUP (one time)
 * ---------------------------------------------------------------------------
 * 1. In Cloudflare: your domain → Email → Email Routing → enable it. Cloudflare
 *    adds the needed DNS records automatically.
 * 2. Email Routing → Email Workers → Create. Paste this file in. Deploy it.
 * 3. Email Routing → Routing rules. For each inbound address (netflix1@...,
 *    netflix2@...), add a custom address that routes to "Send to a Worker" and
 *    pick this worker.
 *    (Or set the Catch-all action to this worker to capture every address.)
 * 4. Worker → Settings → Variables, add:
 *       SITE_URL           = https://ranceldatahub.shop
 *       INBOUND_EMAIL_SECRET = (the same long random string you put in Vercel)
 *    Mark INBOUND_EMAIL_SECRET as "Encrypt".
 *
 * Needs the mimetext-free approach below (no npm libs) so it runs as-is.
 */

export default {
  async email(message, env) {
    try {
      const to = (message.to || "").toLowerCase();
      const from = message.from || "";
      const subject = message.headers.get("subject") || "";

      // Read the raw message and pull out a text body.
      const raw = await streamToString(message.raw);
      const text = extractPlainText(raw);

      await fetch(`${env.SITE_URL}/api/inbound-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.INBOUND_EMAIL_SECRET}`,
        },
        body: JSON.stringify({ to, from, subject, text }),
      });
    } catch (err) {
      // Swallow errors so Cloudflare doesn't bounce the mail; the site's sweep
      // and the buyer's retry cover any miss.
      console.log("inbound email worker error:", err);
    }
  },
};

async function streamToString(stream) {
  const reader = stream.getReader();
  const chunks = [];
  let done = false;
  while (!done) {
    const r = await reader.read();
    done = r.done;
    if (r.value) chunks.push(r.value);
  }
  const blob = new Blob(chunks);
  return await blob.text();
}

/**
 * Very small MIME reader: returns the text/plain part if present, else strips
 * HTML tags from a text/html part, else the raw body after the headers.
 * Good enough for short verification-code emails.
 */
function extractPlainText(raw) {
  const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i);
  const headerEnd = raw.indexOf("\r\n\r\n");
  const afterHeaders = headerEnd >= 0 ? raw.slice(headerEnd + 4) : raw;

  if (boundaryMatch) {
    const parts = afterHeaders.split(`--${boundaryMatch[1]}`);
    let htmlFallback = "";
    for (const part of parts) {
      if (/content-type:\s*text\/plain/i.test(part)) {
        return decodePart(part);
      }
      if (/content-type:\s*text\/html/i.test(part)) {
        htmlFallback = part;
      }
    }
    if (htmlFallback) return stripHtml(decodePart(htmlFallback));
  }

  // Not multipart.
  if (/content-type:\s*text\/html/i.test(raw)) return stripHtml(afterHeaders);
  return afterHeaders.trim();
}

function decodePart(part) {
  const bodyStart = part.indexOf("\r\n\r\n");
  let body = bodyStart >= 0 ? part.slice(bodyStart + 4) : part;
  if (/content-transfer-encoding:\s*base64/i.test(part)) {
    try {
      body = atob(body.replace(/\s+/g, ""));
    } catch {
      /* leave as-is */
    }
  } else if (/content-transfer-encoding:\s*quoted-printable/i.test(part)) {
    body = body.replace(/=\r\n/g, "").replace(/=([A-Fa-f0-9]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
  return body.trim();
}

function stripHtml(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
