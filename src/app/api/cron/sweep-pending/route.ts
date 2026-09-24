import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyTransaction } from "@/lib/paystack";
import {
  fulfillDataOrder,
  fulfillPinOrder,
  fulfillAgentTopup,
  resolveDataOrderDelivery,
} from "@/lib/fulfillment";
import { getOrderStatus } from "@/lib/supplier";

// Automated sweep:
// - Finds stale PENDING payments and verifies them with Paystack.
// - Finds PROCESSING data orders and checks the supplier.
// - Uses small batches so the endpoint can finish within a 30-second cron limit.
//
// IMPORTANT:
// This route is protected by CRON_SECRET.
// Caller must send:
// Authorization: Bearer <CRON_SECRET>

const STALE_AFTER_MINUTES = 10;

// Maximum number of records of each type to inspect per run.
// Remaining records will be handled by the next cron execution.
const MAX_PER_TYPE = 5;

// Number of external operations allowed to run at the same time.
const CONCURRENCY = 3;

// Stop starting new work before the cron provider's 30-second timeout.
// This gives the response some breathing room.
const MAX_RUNTIME_MS = 24_000;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Result = {
  reference: string;
  type: string;
  outcome: string;
};

export async function GET(req: NextRequest) {
  const startedAt = Date.now();

  // ---------------------------------------------------------
  // 1. CRON AUTHENTICATION
  // ---------------------------------------------------------

  const secret = process.env.CRON_SECRET;

  if (secret) {
    const auth = req.headers.get("authorization");

    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  // ---------------------------------------------------------
  // 2. FIND STALE ORDERS
  // ---------------------------------------------------------

  const cutoff = new Date(
    Date.now() - STALE_AFTER_MINUTES * 60 * 1000
  );

  try {
    const [
      stalePinOrders,
      staleDataOrders,
      staleAgentTopups,
      stuckProcessingOrders,
    ] = await Promise.all([
      prisma.pinOrder.findMany({
        where: {
          paymentStatus: "PENDING",
          createdAt: { lt: cutoff },
          paystackReference: { not: null },
        },
        orderBy: {
          createdAt: "asc",
        },
        take: MAX_PER_TYPE,
      }),

      prisma.dataOrder.findMany({
        where: {
          paymentStatus: "PENDING",
          createdAt: { lt: cutoff },
          paystackReference: { not: null },
        },
        orderBy: {
          createdAt: "asc",
        },
        take: MAX_PER_TYPE,
      }),

      prisma.agentTransaction.findMany({
        where: {
          type: "TOPUP",
          status: "PENDING",
          createdAt: { lt: cutoff },
          paystackReference: { not: null },
        },
        orderBy: {
          createdAt: "asc",
        },
        take: MAX_PER_TYPE,
      }),

      prisma.dataOrder.findMany({
        where: {
          fulfillmentStatus: "PROCESSING",
          supplierOrderId: { not: null },
          updatedAt: { lt: cutoff },
        },
        orderBy: {
          updatedAt: "asc",
        },
        take: MAX_PER_TYPE,
      }),
    ]);

    // ---------------------------------------------------------
    // 3. BUILD WORK QUEUE
    // ---------------------------------------------------------

    const jobs: Array<() => Promise<Result>> = [];

    for (const order of staleDataOrders) {
      jobs.push(() =>
        resolveOne(order.paystackReference!, "data")
      );
    }

    for (const order of stalePinOrders) {
      jobs.push(() =>
        resolveOne(order.paystackReference!, "pin")
      );
    }

    for (const txn of staleAgentTopups) {
  jobs.push(() =>
    resolveOne(txn.paystackReference!, "agent_topup")
  );
}

    for (const order of stuckProcessingOrders) {
      jobs.push(() =>
        checkDeliveryStatus(order.supplierOrderId!)
          .then((outcome) => ({
            reference: order.supplierOrderId!,
            type: "data_delivery",
            outcome,
          }))
      );
    }

    // ---------------------------------------------------------
    // 4. PROCESS QUEUE WITH LIMITED CONCURRENCY
    // ---------------------------------------------------------

    const results = await processWithConcurrency(
      jobs,
      CONCURRENCY,
      startedAt
    );

    // ---------------------------------------------------------
    // 5. RETURN QUICKLY
    // ---------------------------------------------------------

    const elapsedMs = Date.now() - startedAt;

    // Keep the response TINY — cron-job.org rejects large responses
    // ("output too large"). Return only counts, not the full results array.
    const resolved = results.filter(
      (r: any) => typeof r === "string"
        ? (r.startsWith("resolved") || r === "fulfilled")
        : (r?.outcome ? String(r.outcome).startsWith("resolved") || r.outcome === "fulfilled" : false)
    ).length;

    return NextResponse.json({
      success: true,
      checked: results.length,
      resolved,
      elapsedMs,
      remaining:
        jobs.length > results.length
          ? jobs.length - results.length
          : 0,
    });
  } catch (err: any) {
    console.error("Cron sweep failed:", err);

    return NextResponse.json(
      {
        error: "Sweep failed",
        message: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------
// PROCESS JOBS WITH LIMITED CONCURRENCY
// ---------------------------------------------------------

async function processWithConcurrency(
  jobs: Array<() => Promise<Result>>,
  concurrency: number,
  startedAt: number
): Promise<Result[]> {
  const results: Result[] = [];

  let nextIndex = 0;

  async function worker() {
    while (true) {
      // Stop starting new work when we're getting close
      // to the cron provider's 30-second timeout.
      if (Date.now() - startedAt >= MAX_RUNTIME_MS) {
        return;
      }

      const index = nextIndex++;

      if (index >= jobs.length) {
        return;
      }

      try {
        const result = await jobs[index]();

        results.push(result);
      } catch (err: any) {
        results.push({
          reference: `job-${index}`,
          type: "unknown",
          outcome: `error: ${err?.message || "Unknown error"}`,
        });
      }
    }
  }

  const workerCount = Math.min(
    concurrency,
    jobs.length
  );

  await Promise.all(
    Array.from(
      { length: workerCount },
      () => worker()
    )
  );

  return results;
}

// ---------------------------------------------------------
// PAYSTACK TRANSACTION RESOLUTION
// ---------------------------------------------------------

async function resolveOne(
  reference: string,
  type: "data" | "pin" | "agent_topup"
): Promise<Result> {
  try {
    const tx = await verifyTransaction(reference);

    // Payment was not successful.
    if (tx.status !== "success") {
      if (type === "data") {
        await prisma.dataOrder.update({
          where: {
            paystackReference: reference,
          },
          data: {
            paymentStatus: "FAILED",
          },
        });
      } else if (type === "pin") {
        await prisma.pinOrder.update({
          where: {
            paystackReference: reference,
          },
          data: {
            paymentStatus: "FAILED",
          },
        });
      } else {
        await prisma.agentTransaction.update({
          where: {
            paystackReference: reference,
          },
          data: {
            status: "FAILED",
          },
        });
      }

      return {
        reference,
        type,
        outcome: `marked FAILED (paystack status: ${tx.status})`,
      };
    }

    // Payment succeeded.
    if (type === "data") {
      await fulfillDataOrder(reference);
    } else if (type === "pin") {
      await fulfillPinOrder(reference);
    } else {
      await fulfillAgentTopup(reference);
    }

    return {
      reference,
      type,
      outcome: "fulfilled",
    };
  } catch (err: any) {
    console.error(
      `Failed resolving ${type} transaction ${reference}:`,
      err
    );

    return {
      reference,
      type,
      outcome: `error: ${err?.message || "Unknown error"}`,
    };
  }
}

// ---------------------------------------------------------
// SUPPLIER DELIVERY STATUS
// ---------------------------------------------------------

async function checkDeliveryStatus(
  supplierOrderId: string
): Promise<string> {
  try {
    const status = await getOrderStatus(supplierOrderId);

    if (status.orderStatus === "completed") {
      await resolveDataOrderDelivery(
        supplierOrderId,
        "DELIVERED"
      );

      return "resolved: delivered";
    }

    if (
      status.orderStatus === "failed" ||
      status.orderStatus === "refunded"
    ) {
      await resolveDataOrderDelivery(
        supplierOrderId,
        "FAILED",
        `Supplier status: ${status.orderStatus}`
      );

      return "resolved: failed";
    }

    return `still ${status.orderStatus}`;
  } catch (err: any) {
    console.error(
      `Failed checking supplier order ${supplierOrderId}:`,
      err
    );

    return `error: ${err?.message || "Unknown error"}`;
  }
}

// ---------------------------------------------------------
// SMALL HELPER
// ---------------------------------------------------------

