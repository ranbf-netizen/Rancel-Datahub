import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { resendSmsPoolCode } from "@/lib/smspool";

export const dynamic = "force-dynamic";

// "Request again" - the buyer got a code but it was wrong, didn't work, or
// they just want another one, and the number is still within its rental
// window. Mirrors SMSPool's own Resend button: same number, ask for a fresh
// SMS, go back to waiting.
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "AUTH" }, { status: 401 });

  const { ref } = await req.json();
  if (!ref) return NextResponse.json({ error: "Missing reference." }, { status: 400 });

  const order = await prisma.smsOrder.findUnique({ where: { paystackReference: ref } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.userId !== session.userId) return NextResponse.json({ error: "Not your order." }, { status: 403 });
  if (order.paymentStatus !== "PAID" || !order.poolOrderId) {
    return NextResponse.json({ error: "This order isn't ready to resend." }, { status: 400 });
  }
  if (order.expiresAt && Date.now() > order.expiresAt.getTime()) {
    return NextResponse.json({ error: "This number's rental window has already closed." }, { status: 400 });
  }

  try {
    await resendSmsPoolCode(order.poolOrderId);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not request the code again." }, { status: 502 });
  }

  await prisma.smsOrder.update({
    where: { id: order.id },
    data: { status: "WAITING", smsCode: null, fullSms: null },
  });

  return NextResponse.json({ ok: true });
}
