import { NextRequest, NextResponse } from "next/server";
import { getOrderStatus } from "@/lib/supplier";
import { resolveDataOrderDelivery } from "@/lib/fulfillment";

export const dynamic = "force-dynamic";

// Cledanet's docs mention an optional `callback` URL on order creation but
// don't document the payload shape or a signing scheme for it. Rather than
// trust an unverified request body, we use it only as a signal to re-check
// the order directly via the authenticated GET /order/:id endpoint (which IS
// well documented) - so this is safe even if the callback payload looks
// nothing like what we expect. The sweep (sweep-pending) is the real backbone
// here and will catch anything this misses.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Try the most likely places an order id could appear in their callback body.
  const orderId = body?.id || body?.payload?.id || body?.orderId;
  if (!orderId) {
    return NextResponse.json({ received: true, note: "No order id found in callback body" });
  }

  try {
    const status = await getOrderStatus(orderId);
    if (status.orderStatus === "completed") {
      await resolveDataOrderDelivery(orderId, "DELIVERED");
    } else if (status.orderStatus === "failed") {
      await resolveDataOrderDelivery(orderId, "FAILED", `Supplier status: ${status.rawStatus}`);
    }
  } catch {
    // If the re-check fails, just no-op - the sweep will catch it later.
  }

  return NextResponse.json({ received: true });
}
