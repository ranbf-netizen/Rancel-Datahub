import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWalletBalance, LOW_BALANCE_THRESHOLD } from "@/lib/supplier";

// This is OUR balance on Cledanet, not a customer wallet.
// A low balance here means paid customer orders will start failing to fulfill.
export async function GET() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const balance = await getWalletBalance();
    return NextResponse.json({ balance, low: balance < LOW_BALANCE_THRESHOLD, threshold: LOW_BALANCE_THRESHOLD });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
}
