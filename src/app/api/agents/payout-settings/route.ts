
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const NETWORKS = ["MTN", "TELECEL", "AIRTELTIGO"] as const;

function normalizeGhanaPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;

  let phone = value.replace(/[\s()-]/g, "");

  if (phone.startsWith("+233")) phone = "0" + phone.slice(4);
  else if (phone.startsWith("233")) phone = "0" + phone.slice(3);

  return /^0\d{9}$/.test(phone) ? phone : null;
}

export async function GET() {
  const session = getSession();

  if (!session) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const profile = await prisma.agentProfile.findUnique({
    where: { userId: session.userId },
    select: {
      status: true,
      momoPhone: true,
      momoNetwork: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "Agent profile not found." }, { status: 404 });
  }

  return NextResponse.json({
    momoPhone: profile.momoPhone,
    momoNetwork: profile.momoNetwork,
    status: profile.status,
  });
}

export async function PATCH(req: NextRequest) {
  const session = getSession();

  if (!session) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const momoPhone = normalizeGhanaPhone(body.phone);
  const momoNetwork = body.network;

  if (!momoPhone) {
    return NextResponse.json(
      { error: "Enter a valid Ghanaian mobile number." },
      { status: 400 }
    );
  }

  if (!NETWORKS.includes(momoNetwork)) {
    return NextResponse.json(
      { error: "Select a valid Mobile Money network." },
      { status: 400 }
    );
  }

  const profile = await prisma.agentProfile.findUnique({
    where: { userId: session.userId },
    select: { id: true, status: true },
  });

  if (!profile || profile.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Only approved agents can update payout details." },
      { status: 403 }
    );
  }

  const updated = await prisma.agentProfile.update({
    where: { id: profile.id },
    data: { momoPhone, momoNetwork },
    select: { momoPhone: true, momoNetwork: true },
  });

  return NextResponse.json({
    message: "Payout details saved successfully.",
    ...updated,
  });
}
