import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkSmsPoolCode } from "@/lib/smspool";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("ref");
  if (!reference) return NextResponse.json({ error: "Missing reference." }, { status: 400 });

  let order = await prisma.smsOrder.findUnique({ where: { paystackReference: reference } });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  if (order.paymentStatus !== "PAID") {
    return NextResponse.json({ status: "pending", message: "Payment not confirmed yet. This updates automatically." });
  }

  if (order.status?.startsWith("FAILED")) {
    return NextResponse.json({ status: "failed", message: "We couldn't rent a number for this order. It's been flagged for a refund - contact support if you don't hear back soon." });
  }

  const now = new Date();
  const expired = order.expiresAt ? now > order.expiresAt : false;

  // Already have the code - nothing more to poll, just keep returning it
  // until the window's own countdown runs out on the frontend.
  if (order.status === "RECEIVED") {
    return NextResponse.json({
      status: "received",
      phoneNumber: order.phoneNumber,
      smsCode: order.smsCode,
      fullSms: order.fullSms,
      countryName: order.countryName,
      serviceName: order.serviceName,
      secondsRemaining: order.expiresAt ? Math.max(0, Math.round((order.expiresAt.getTime() - now.getTime()) / 1000)) : 0,
    });
  }

  if (expired) {
    if (order.status !== "EXPIRED") {
      await prisma.smsOrder.update({ where: { id: order.id }, data: { status: "EXPIRED" } });
    }
    return NextResponse.json({ status: "expired", phoneNumber: order.phoneNumber, countryName: order.countryName, serviceName: order.serviceName });
  }

  if (order.status === "WAITING" && order.poolOrderId) {
    try {
      const result = await checkSmsPoolCode(order.poolOrderId);
      if (result.received) {
        order = await prisma.smsOrder.update({
          where: { id: order.id },
          data: { status: "RECEIVED", smsCode: result.code, fullSms: result.fullSms },
        });
      }
    } catch {
      // Transient SMSPool error while polling - just report "waiting" again,
      // the next poll (a few seconds later) will retry.
    }
  }

  return NextResponse.json({
    status: order.status === "RECEIVED" ? "received" : "waiting",
    phoneNumber: order.phoneNumber,
    smsCode: order.smsCode,
    fullSms: order.fullSms,
    countryName: order.countryName,
    serviceName: order.serviceName,
    secondsRemaining: order.expiresAt ? Math.max(0, Math.round((order.expiresAt.getTime() - now.getTime()) / 1000)) : 0,
  });
}
