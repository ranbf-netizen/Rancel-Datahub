import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

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
