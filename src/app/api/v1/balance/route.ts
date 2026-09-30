import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApiKey } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

// GET /api/v1/balance — the agent's top-up wallet balance (spending).
export async function GET(req: Request) {
  const agent = await authenticateApiKey(req);
  if (!agent) return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });

  const fresh = await prisma.agentProfile.findUnique({ where: { id: agent.id } });
  return NextResponse.json({ balance: fresh?.walletBalance ?? 0, currency: "GHS" });
}