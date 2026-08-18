import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { resolveDataOrderDelivery } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

// DataMart calls this the moment a bundle actually finishes delivering (or
// fails), roughly 30 seconds after we place the order. Configure this URL in
// DataMart's Developer API settings: https://yourdomain.com/api/webhooks/datamart
//
// They require a fast response (< 8s) and don't retry failed deliveries, so
// this handler does the minimum work needed and returns immediately.
export async function POST(req: NextRequest) {
  const secret = process.env.DATAMART_WEBHOOK_SECRET;
  const rawBody = await req.text();

  if (secret) {
    const signature = req.headers.get("x-webhook-signature");
    const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reference = event?.data?.reference;

  if (event.event === "order.completed" && reference) {
    await resolveDataOrderDelivery(reference, "DELIVERED");
  } else if (event.event === "order.failed" && reference) {
    await resolveDataOrderDelivery(reference, "FAILED", "DataMart reported delivery failure.");
  } else if (event.event === "order.refunded" && reference) {
    await resolveDataOrderDelivery(reference, "FAILED", "DataMart refunded this order.");
  }
  // order.created and withdrawal.* events are informational only, no action needed here.

  return NextResponse.json({ received: true });
}
