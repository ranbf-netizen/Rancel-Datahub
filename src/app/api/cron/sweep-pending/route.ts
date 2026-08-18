import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";
import { fulfillDataOrder, fulfillPinOrder, fulfillAgentTopup, resolveDataOrderDelivery } from "@/lib/fulfillment";
import { getOrderStatus } from "@/lib/supplier";

// Automated sweep: finds any order still PENDING after a few minutes and
// resolves it against Paystack directly, so nothing is ever stuck waiting
// on a webhook that might not arrive. Meant to be called on a schedule
// (see vercel.json), not by users.
//
// Also checks data orders stuck at PROCESSING (paid, order placed with
// DataMart, but never got a completion webhook) - DataMart explicitly does
// NOT retry failed webhook deliveries, so if our endpoint has any downtime
// at all, that confirmation is gone for good unless we actively poll for it.
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

  const [stalePinOrders, staleDataOrders, staleAgentTopups, stuckProcessingOrders] = await Promise.all([
    prisma.pinOrder.findMany({
      where: { paymentStatus: "PENDING", createdAt: { lt: cutoff }, paystackReference: { not: null } },
    }),
    prisma.dataOrder.findMany({
      where: { paymentStatus: "PENDING", createdAt: { lt: cutoff }, paystackReference: { not: null } },
    }),
    prisma.agentTransaction.findMany({
      where: { type: "TOPUP", status: "PENDING", createdAt: { lt: cutoff }, paystackReference: { not: null } },
    }),
    prisma.dataOrder.findMany({
      where: { fulfillmentStatus: "PROCESSING", supplierOrderId: { not: null }, updatedAt: { lt: cutoff } },
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

  for (const txn of staleAgentTopups) {
    const outcome = await resolveOne(txn.paystackReference!, "agent_topup");
    results.push({ reference: txn.paystackReference!, type: "agent_topup", outcome });
  }

  for (const order of stuckProcessingOrders) {
    const outcome = await checkDeliveryStatus(order.supplierOrderId!);
    results.push({ reference: order.supplierOrderId!, type: "data_delivery", outcome });
  }

  return NextResponse.json({ checked: results.length, results });
}

async function checkDeliveryStatus(supplierOrderId: string): Promise<string> {
  try {
    const status = await getOrderStatus(supplierOrderId);
    if (status.orderStatus === "completed") {
      await resolveDataOrderDelivery(supplierOrderId, "DELIVERED");
      return "resolved: delivered";
    }
    if (status.orderStatus === "failed" || status.orderStatus === "refunded") {
      await resolveDataOrderDelivery(supplierOrderId, "FAILED", `Supplier status: ${status.orderStatus}`);
      return "resolved: failed";
    }
    return `still ${status.orderStatus}`;
  } catch (err: any) {
    return `error: ${err.message}`;
  }
}

async function resolveOne(reference: string, type: "data" | "pin" | "agent_topup"): Promise<string> {
  try {
    const tx = await verifyTransaction(reference);

    if (tx.status !== "success") {
      if (type === "data") {
        await prisma.dataOrder.update({ where: { paystackReference: reference }, data: { paymentStatus: "FAILED" } });
      } else if (type === "pin") {
        await prisma.pinOrder.update({ where: { paystackReference: reference }, data: { paymentStatus: "FAILED" } });
      } else {
        await prisma.agentTransaction.update({ where: { paystackReference: reference }, data: { status: "FAILED" } });
      }
      return `marked FAILED (paystack status: ${tx.status})`;
    }

    if (type === "data") await fulfillDataOrder(reference);
    else if (type === "pin") await fulfillPinOrder(reference);
    else await fulfillAgentTopup(reference);

    return "fulfilled";
  } catch (err: any) {
    return `error: ${err.message}`;
  }
}
