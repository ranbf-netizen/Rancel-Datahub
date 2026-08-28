import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Slug: 3-30 chars, lowercase letters, numbers and single hyphens only.
function normalizeSlug(raw: string) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const profile = await prisma.agentProfile.findUnique({ where: { userId: session.userId } });
  if (!profile) return NextResponse.json({ error: "No agent profile." }, { status: 404 });
  return NextResponse.json({
    storeSlug: profile.storeSlug,
    storeMarkup: profile.storeMarkup,
    approved: profile.status === "APPROVED",
  });
}

export async function PATCH(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const profile = await prisma.agentProfile.findUnique({ where: { userId: session.userId } });
  if (!profile) return NextResponse.json({ error: "No agent profile." }, { status: 404 });
  if (profile.status !== "APPROVED") {
    return NextResponse.json({ error: "Your agent account must be approved first." }, { status: 403 });
  }

  const { slug, markup } = await req.json();

  const data: { storeSlug?: string; storeMarkup?: number } = {};

  if (slug !== undefined) {
    const clean = normalizeSlug(String(slug));
    if (clean.length < 3 || clean.length > 30) {
      return NextResponse.json({ error: "Store name must be 3–30 characters (letters, numbers, hyphens)." }, { status: 400 });
    }
    // Uniqueness check (ignore if it's already this agent's own slug).
    const taken = await prisma.agentProfile.findUnique({ where: { storeSlug: clean } });
    if (taken && taken.id !== profile.id) {
      return NextResponse.json({ error: "That store name is already taken — try another." }, { status: 409 });
    }
    data.storeSlug = clean;
  }

  if (markup !== undefined) {
    const m = Number(markup);
    if (!Number.isFinite(m) || m < 0 || m > 100) {
      return NextResponse.json({ error: "Markup must be a percentage between 0 and 100." }, { status: 400 });
    }
    data.storeMarkup = Math.round(m * 100) / 100;
  }

  const updated = await prisma.agentProfile.update({ where: { id: profile.id }, data });
  return NextResponse.json({ storeSlug: updated.storeSlug, storeMarkup: updated.storeMarkup });
}
