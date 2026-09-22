/**
 * PIN sourcing: currently manual — admin uploads batches bought in bulk from a
 * third-party source (see /admin/pins). This is deliberately isolated behind
 * fulfillDataOrder/fulfillPinOrder in lib/fulfillment.ts.
 *
 * ============================================================
 *  INTEGRATE LIVE WAEC/BECE/WASSCE CHECKER PIN API HERE
 * ============================================================
 * When a real checker PIN supplier API is ready:
 *   1. Add a wrapper here (same pattern as src/lib/supplier.ts for data bundles).
 *   2. In fulfillPinOrder() (src/lib/fulfillment.ts), replace the "claim one
 *      AVAILABLE Pin from stock" logic with a live API call to buy a PIN on
 *      demand, OR keep both paths (batch stock first, live API as fallback).
 *   3. No other files need to change — routes, checkout, and admin already
 *      call through fulfillPinOrder() only.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Expects JSON: { examType, year, costPrice, sellingPrice, csv }
// csv format (no header): serial_number,pin_code   — one pair per line
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { examType, year, costPrice, sellingPrice, csv } = await req.json();
  if (!examType || !year || !csv) {
    return NextResponse.json({ error: "examType, year, and csv are required." }, { status: 400 });
  }

  const rows = csv
    .split("\n")
    .map((r: string) => r.trim())
    .filter((r: string) => r.length > 0)
    .map((r: string) => r.split(","));

  const batch = await prisma.pinBatch.create({
    data: {
      examType,
      year: Number(year),
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      uploadedBy: session.userId,
    },
  });

  let added = 0;
  let skipped = 0;

  for (const [serialNumber, pinCode] of rows) {
    if (!serialNumber || !pinCode) {
      skipped++;
      continue;
    }
    try {
      await prisma.pin.create({
        data: { batchId: batch.id, serialNumber: serialNumber.trim(), pinCode: pinCode.trim() },
      });
      added++;
    } catch {
      skipped++; // duplicate serial within this batch
    }
  }

  return NextResponse.json({ batchId: batch.id, added, skipped });
}
