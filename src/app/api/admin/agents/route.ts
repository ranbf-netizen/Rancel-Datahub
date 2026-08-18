import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function requireAdmin() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [agents, pendingWithdrawals] = await Promise.all([
    prisma.agentProfile.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } }),
    prisma.agentTransaction.findMany({
      where: { type: "WITHDRAWAL", status: "PENDING" },
      include: { agent: { include: { user: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return NextResponse.json({ agents, pendingWithdrawals });
}

// Approve/reject/suspend an agent, or adjust their reseller discount.
export async function PATCH(req: NextRequest) {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, status, discountPercent } = await req.json();

  const profile = await prisma.agentProfile.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(discountPercent !== undefined ? { discountPercent } : {}),
    },
  });

  return NextResponse.json(profile);
}
