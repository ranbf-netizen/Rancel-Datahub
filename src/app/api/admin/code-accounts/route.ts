import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function admin() {
  const s = getSession();
  return s && s.role === "ADMIN" ? s : null;
}

// Must be a valid email on your own receiving domain.
function cleanInbound(value: unknown): string | null {
  const v = String(value || "").toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  return v;
}

export async function GET() {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const accounts = await prisma.codeAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { id: true, title: true } },
      _count: { select: { sessions: { where: { status: { in: ["WAITING", "ACTIVE"] } } } } },
    },
  });
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const body = await req.json();
  const { productId, label, loginEmail, inboundAddress, revealSeconds, turnSeconds } = body;

  if (!productId || !label || !loginEmail) {
    return NextResponse.json({ error: "Product, label and login email are required." }, { status: 400 });
  }

  const inbound = cleanInbound(inboundAddress);
  if (!inbound) {
    return NextResponse.json({ error: "Enter a valid inbound address, e.g. netflix1@ranceldatahub.shop" }, { status: 400 });
  }

  const product = await prisma.digitalProduct.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  try {
    const account = await prisma.codeAccount.create({
      data: {
        productId,
        label: String(label).trim(),
        loginEmail: String(loginEmail).trim(),
        inboundAddress: inbound,
        revealSeconds: Number(revealSeconds) > 0 ? Number(revealSeconds) : 60,
        turnSeconds: Number(turnSeconds) > 0 ? Number(turnSeconds) : 180,
      },
    });
    return NextResponse.json(account);
  } catch (e: any) {
    if (String(e?.code) === "P2002") {
      return NextResponse.json({ error: "That inbound address is already used by another account." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create the account." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const { id, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: "Account ID is required." }, { status: 400 });

  const data: any = {};
  if (fields.label !== undefined) data.label = String(fields.label).trim();
  if (fields.loginEmail !== undefined) data.loginEmail = String(fields.loginEmail).trim();
  if (fields.active !== undefined) data.active = !!fields.active;
  if (fields.revealSeconds !== undefined) data.revealSeconds = Number(fields.revealSeconds) > 0 ? Number(fields.revealSeconds) : 60;
  if (fields.turnSeconds !== undefined) data.turnSeconds = Number(fields.turnSeconds) > 0 ? Number(fields.turnSeconds) : 180;
  if (fields.inboundAddress !== undefined) {
    const inbound = cleanInbound(fields.inboundAddress);
    if (!inbound) return NextResponse.json({ error: "Invalid inbound address." }, { status: 400 });
    data.inboundAddress = inbound;
  }

  try {
    const updated = await prisma.codeAccount.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e: any) {
    if (String(e?.code) === "P2002") {
      return NextResponse.json({ error: "That inbound address is already used by another account." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not update the account." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!admin()) return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Account ID is required." }, { status: 400 });

  // Block deletion if buyers are currently queued, to avoid stranding them.
  const live = await prisma.codeSession.count({ where: { accountId: id, status: { in: ["WAITING", "ACTIVE"] } } });
  if (live > 0) {
    return NextResponse.json({ error: `${live} buyer(s) are currently in this account's queue. Pause it instead, or wait until it's clear.` }, { status: 409 });
  }

  await prisma.codeAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
