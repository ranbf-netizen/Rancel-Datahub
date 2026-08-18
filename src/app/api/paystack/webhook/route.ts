import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { fulfillDataOrder, fulfillPinOrder, fulfillAgentTopup } from "@/lib/fulfillment";

// Paystack calls this URL after every transaction event. Configure it in the
// Paystack dashboard as: https://yourdomain.com/api/paystack/webhook
export async function POST(req: NextRequest) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const rawBody = await req.text();

  if (secret) {
    const signature = req.headers.get("x-paystack-signature");
    const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const event = JSON.parse(rawBody);

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true });
  }

  const { reference, metadata } = event.data;
  const orderType = metadata?.orderType;

  if (orderType === "data") {
    await fulfillDataOrder(reference);
  } else if (orderType === "pin") {
    await fulfillPinOrder(reference);
  } else if (orderType === "agent_topup") {
    await fulfillAgentTopup(reference);
  }

  return NextResponse.json({ received: true });
}
