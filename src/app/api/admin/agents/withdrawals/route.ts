
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// List withdrawal requests.
export async function GET() {
  const session = getSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const withdrawals = await prisma.agentTransaction.findMany({
    where: { type: "WITHDRAWAL" },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      agent: {
        include: {
          user: { select: { name: true, phone: true } },
        },
      },
    },
  });

  return NextResponse.json(
    withdrawals.map((w) => {
      // New withdrawal records contain a snapshot in the description:
      // Withdrawal to MTN (024XXXXXXX)
      const match = w.description?.match(
        /^Withdrawal to ([^(]+)\s+\(([^)]+)\)$/
      );

      return {
        id: w.id,
        agentName: w.agent?.user?.name ?? "—",
        agentPhone: w.agent?.user?.phone ?? "—",

        momoNetwork: match
          ? match[1].trim()
          : w.agent?.momoNetwork ?? "—",

        momoPhone: match
          ? match[2].trim()
          : w.agent?.momoPhone ?? "—",

        payoutDetailsCaptured: Boolean(match),

        walletBalance: w.agent?.earningsBalance ?? 0,
        amount: Math.abs(w.amount),
        status: w.status,
        createdAt: w.createdAt,
      };
    })
  );
}

// Admin marks a pending withdrawal as paid.
export async function PATCH(req: NextRequest) {
  const session = getSession();

  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Invalid withdrawal ID." }, { status: 400 });
  }

  const updated = await prisma.agentTransaction.updateMany({
    where: {
      id: body.id,
      type: "WITHDRAWAL",
      status: "PENDING",
    },
    data: { status: "COMPLETED" },
  });

  if (updated.count !== 1) {
    return NextResponse.json(
      { error: "Withdrawal not found or has already been processed." },
      { status: 409 }
    );
  }

  return NextResponse.json({ message: "Withdrawal marked as paid." });
}
