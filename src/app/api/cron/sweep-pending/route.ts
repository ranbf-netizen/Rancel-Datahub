import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";
import { fulfillDataOrder, fulfillPinOrder } from "@/lib/fulfillment";

// Automated sweep: finds any order still PENDING after a few minutes and
// resolves it against Paystack directly, so nothing is ever stuck waiting
// on a webhook that might not arrive. Meant to be called on a schedule
// (see vercel.json), not by users.
//
// Protected by CRON_SECRET so random people can't trigger it - the caller
// must send: Authorization: Bearer <CRON_SECRET>
const STALE_AFTER_MINUTES = 10;

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const cutoff = new Date(Date.now() - STALE_AFTER_MINUTES * 60 * 1000);

  const [stalePinOrders, staleDataOrders] = await Promise.all([
    prisma.pinOrder.findMany({
      where: { paymentStatus: "PENDING", createdAt: { lt: cutoff }, paystackReference: { not: null } },
    }),
    prisma.dataOrder.findMany({
      where: { paymentStatus: "PENDING", createdAt: { lt: cutoff }, paystackReference: { not: null } },
    }),
  ]);

  const results: Array<{ reference: string; type: string; outcome: string }> = [];

  for (const order of staleDataOrders) {
    const outcome = await resolveOne(order.paystackReference!, "data");
    results.push({ reference: order.paystackReference!, type: "data", outcome });
  }

  for (const order of stalePinOrders) {
    const outcome = await resolveOne(order.paystackReference!, "pin");
    results.push({ reference: order.paystackReference!, type: "pin", outcome });
  }

  return NextResponse.json({ checked: results.length, results });
}

async function resolveOne(reference: string, type: "data" | "pin"): Promise<string> {
  try {
    const tx = await verifyTransaction(reference);

    if (tx.status !== "success") {
      if (type === "data") {
        await prisma.dataOrder.update({ where: { paystackReference: reference }, data: { paymentStatus: "FAILED" } });
      } else {
        await prisma.pinOrder.update({ where: { paystackReference: reference }, data: { paymentStatus: "FAILED" } });
      }
      return `marked FAILED (paystack status: ${tx.status})`;
    }

    if (type === "data") {
      await fulfillDataOrder(reference);
    } else {
      await fulfillPinOrder(reference);
    }
    return "fulfilled";
  } catch (err: any) {
    return `error: ${err.message}`;
  }
}
