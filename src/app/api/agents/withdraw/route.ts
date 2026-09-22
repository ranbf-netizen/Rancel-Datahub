import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Deducts the amount immediately and records a PENDING withdrawal for admin to
// actually pay out (bank/momo transfer happens outside the platform, manually).
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const { amount } = await req.json();
  const amountGhs = Number(amount);
  if (!amountGhs || amountGhs <= 0) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }
  if (amountGhs < 10) {
    return NextResponse.json({ error: "Minimum withdrawal is GH₵ 10." }, { status: 400 });
  }

  const profile = await prisma.agentProfile.findUnique({ where: { userId: session.userId } });
  if (!profile || profile.status !== "APPROVED") {
    return NextResponse.json({ error: "You need an approved agent account first." }, { status: 403 });
  }
  if (profile.walletBalance < amountGhs) {
    return NextResponse.json({ error: "Insufficient wallet balance." }, { status: 402 });
  }

  const [, txn] = await prisma.$transaction([
    prisma.agentProfile.update({ where: { id: profile.id }, data: { walletBalance: { decrement: amountGhs } } }),
    prisma.agentTransaction.create({
      data: { agentId: profile.id, type: "WITHDRAWAL", amount: -amountGhs, status: "PENDING", description: "Withdrawal requested" },
    }),
  ]);

  return NextResponse.json(txn);
}
