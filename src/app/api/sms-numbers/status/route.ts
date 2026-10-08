import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { checkSmsPoolCode } from "@/lib/smspool";
import { refundOrder } from "@/lib/smsWallet";

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
    return NextResponse.json({
      status: "failed",
      message: order.refunded
        ? `We couldn't rent a number for this order. GH₵${order.amount.toFixed(2)} has been refunded to your wallet.`
        : "We couldn't rent a number for this order. It's being refunded to your wallet now.",
    });
  }

  const now = new Date();
  const expired = order.expiresAt ? now > order.expiresAt : false;

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
      // First time seeing this order as expired - close it out and refund
      // automatically. refundOrder's own `refunded` guard means even if two
      // status polls land here at the same instant, only one actually
      // credits the wallet.
      await prisma.smsOrder.update({ where: { id: order.id }, data: { status: "EXPIRED" } });
      await refundOrder(order.id, order.userId, order.amount, "No code arrived within the rental window");
    }
    return NextResponse.json({
      status: "expired",
      phoneNumber: order.phoneNumber,
      countryName: order.countryName,
      serviceName: order.serviceName,
      message: `No code arrived in time. GH₵${order.amount.toFixed(2)} has been refunded to your wallet.`,
    });
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
