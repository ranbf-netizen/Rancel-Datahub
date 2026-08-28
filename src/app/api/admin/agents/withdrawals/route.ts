import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// List agent withdrawal requests (pending first) so admin can action them.
export async function GET() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const withdrawals = await prisma.agentTransaction.findMany({
    where: { type: "WITHDRAWAL" },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { agent: { include: { user: { select: { name: true, phone: true } } } } },
  });

  return NextResponse.json(
    withdrawals.map((w: any) => ({
      id: w.id,
      agentName: w.agent?.user?.name ?? "—",
      agentPhone: w.agent?.user?.phone ?? "—",
      walletBalance: w.agent?.walletBalance ?? 0,
      amount: Math.abs(w.amount),
      status: w.status,
      createdAt: w.createdAt,
    }))
  );
}

// Admin manually pays the agent (bank/momo transfer, outside the platform)
// then marks the withdrawal COMPLETED here for record-keeping.
export async function PATCH(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await req.json();
  const txn = await prisma.agentTransaction.update({
    where: { id },
    data: { status: "COMPLETED" },
  });

  return NextResponse.json(txn);
}
