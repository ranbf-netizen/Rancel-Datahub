import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Marks all pending refunds as resolved (bookkeeping only — does NOT send money).
// Admin must actually pay the customers first, then click to mark them handled.
export async function POST() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await prisma.refund.updateMany({
    where: { status: "pending" },
    data: { status: "resolved" },
  });

  return NextResponse.json({ resolved: result.count });
}