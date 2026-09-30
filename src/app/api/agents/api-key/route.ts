import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function getAgent(userId: string) {
  return prisma.agentProfile.findUnique({ where: { userId } });
}

// Get the agent's current API key (or null).
export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const agent = await getAgent(session.userId);
  if (!agent) return NextResponse.json({ error: "Not an agent." }, { status: 403 });

  const existing = await prisma.apiKey.findUnique({ where: { agentId: agent.id } });
  return NextResponse.json({ key: existing?.key ?? null, active: existing?.active ?? false });
}

// Generate (or regenerate) the agent's API key.
export async function POST() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const agent = await getAgent(session.userId);
  if (!agent) return NextResponse.json({ error: "Not an agent." }, { status: 403 });
  if (agent.status !== "APPROVED") return NextResponse.json({ error: "Your agent account must be approved first." }, { status: 403 });

  const newKey = "rdh_live_" + randomBytes(24).toString("hex");

  const saved = await prisma.apiKey.upsert({
    where: { agentId: agent.id },
    update: { key: newKey, active: true },
    create: { agentId: agent.id, key: newKey, active: true },
  });

  return NextResponse.json({ key: saved.key, active: true });
}

// Revoke (deactivate) the agent's API key.
export async function DELETE() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const agent = await getAgent(session.userId);
  if (!agent) return NextResponse.json({ error: "Not an agent." }, { status: 403 });

  await prisma.apiKey.updateMany({ where: { agentId: agent.id }, data: { active: false } });
  return NextResponse.json({ ok: true });
}