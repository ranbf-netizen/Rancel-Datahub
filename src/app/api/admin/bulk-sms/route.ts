import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendSms, toIntlFormat } from "@/lib/sms";

export const dynamic = "force-dynamic";
function admin() { const s = getSession(); return s && s.role === "ADMIN" ? s : null; }

// Collects all unique customer numbers (registered users + guest order phones).
async function collectNumbers(): Promise<string[]> {
  const [users, dataOrders, afaOrders] = await Promise.all([
    prisma.user.findMany({ select: { phone: true } }),
    prisma.dataOrder.findMany({ where: { userId: null }, select: { beneficiaryNumber: true } }),
    prisma.afaOrder.findMany({ where: { userId: null }, select: { phoneNumber: true } }),
  ]);
  const set = new Set<string>();
  users.forEach((u: any) => { const n = toIntlFormat(u.phone); if (n) set.add(n); });
  dataOrders.forEach((o: any) => { const n = toIntlFormat(o.beneficiaryNumber); if (n) set.add(n); });
  afaOrders.forEach((o: any) => { const n = toIntlFormat(o.phoneNumber); if (n) set.add(n); });
  return Array.from(set);
}

// GET: how many recipients we'd send to (for the count before sending).
export async function GET() {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const numbers = await collectNumbers();
  return NextResponse.json({ count: numbers.length });
}

// POST: send the bulk message. Batches recipients so we don't overload the API.
export async function POST(req: NextRequest) {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const { message } = await req.json();
  if (!message || !message.trim()) return NextResponse.json({ error: "Message is required." }, { status: 400 });

  const numbers = await collectNumbers();
  if (numbers.length === 0) return NextResponse.json({ error: "No recipients found." }, { status: 400 });

  const BATCH = 100;
  let totalSent = 0;
  let failedBatches = 0;
  let lastError = "";

  for (let i = 0; i < numbers.length; i += BATCH) {
    const batch = numbers.slice(i, i + BATCH);
    const result = await sendSms(batch, message);
    if (result.ok) totalSent += result.sent;
    else { failedBatches++; lastError = result.error || "unknown"; }
  }

  return NextResponse.json({
    recipients: numbers.length,
    sent: totalSent,
    failedBatches,
    ...(failedBatches > 0 ? { error: `Some batches failed: ${lastError}` } : {}),
  });
}