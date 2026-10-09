import { NextRequest, NextResponse } from "next/server";
import { ingestInboundEmail } from "@/lib/codeQueue";

export const dynamic = "force-dynamic";

/**
 * Receives an email that arrived at one of your inbound addresses
 * (e.g. netflix1@ranceldatahub.shop), forwarded here by the Cloudflare Email
 * Worker. Protected by a shared secret so only your worker can post to it.
 *
 * Expected JSON body:
 *   { "to": "...", "from": "...", "subject": "...", "text": "..." }
 * Expected header:
 *   Authorization: Bearer <INBOUND_EMAIL_SECRET>
 */
export async function POST(req: NextRequest) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Inbound email is not configured." }, { status: 503 });
  }

  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const to = String(payload?.to || "").toLowerCase().trim();
  const from = String(payload?.from || "").trim();
  const subject = payload?.subject ? String(payload.subject) : null;
  const text = String(payload?.text || payload?.body || "");

  if (!to || !text) {
    return NextResponse.json({ error: "Missing 'to' or 'text'." }, { status: 400 });
  }

  const result = await ingestInboundEmail({
    inboundAddress: to,
    fromAddress: from,
    subject,
    body: text,
  });

  // Always 200 to the worker so it doesn't retry-storm; report status in body.
  return NextResponse.json({ received: true, matched: result.ok, reason: result.reason });
}
