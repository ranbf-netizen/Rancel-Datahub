
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Please log in first." },
      { status: 401 }
    );
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  const amountGhs = Number(body.amount);

  if (
    !Number.isFinite(amountGhs) ||
    amountGhs <= 0 ||
    Math.round(amountGhs * 100) !== amountGhs * 100
  ) {
    return NextResponse.json(
      { error: "Enter a valid withdrawal amount." },
      { status: 400 }
    );
  }

  if (amountGhs < 10) {
    return NextResponse.json(
      { error: "Minimum withdrawal is GH₵ 10." },
      { status: 400 }
    );
  }

  const profile = await prisma.agentProfile.findUnique({
    where: { userId: session.userId },
    select: {
      id: true,
      status: true,
      momoPhone: true,
      momoNetwork: true,
    },
  });

  if (!profile || profile.status !== "APPROVED") {
    return NextResponse.json(
      { error: "You need an approved agent account first." },
      { status: 403 }
    );
  }

  if (!profile.momoPhone || !profile.momoNetwork) {
    return NextResponse.json(
      { error: "Please save your Mobile Money payout details first." },
      { status: 400 }
    );
  }

  try {
    const txn = await prisma.$transaction(async (tx) => {
      // Atomically deduct only if sufficient balance remains.
      const deduction = await tx.agentProfile.updateMany({
        where: {
          id: profile.id,
          earningsBalance: { gte: amountGhs },
        },
        data: {
          earningsBalance: { decrement: amountGhs },
        },
      });

      if (deduction.count !== 1) {
        return null;
      }

      // Record the withdrawal for admin processing.
      return await tx.agentTransaction.create({
        data: {
          agentId: profile.id,
          type: "WITHDRAWAL",
          amount: -amountGhs,
          status: "PENDING",
          description: `Withdrawal to ${profile.momoNetwork} (${profile.momoPhone})`,
        },
      });
    });

    if (!txn) {
      return NextResponse.json(
        { error: "Insufficient earnings balance." },
        { status: 402 }
      );
    }

    return NextResponse.json({
      message: "Withdrawal request submitted successfully.",
      transaction: txn,
    });

  } catch (error) {
    console.error("Agent withdrawal error:", error);

    return NextResponse.json(
      { error: "Withdrawal failed. Please try again." },
      { status: 500 }
    );
  }
}
