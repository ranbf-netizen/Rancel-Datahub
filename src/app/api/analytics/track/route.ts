import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Detect a coarse traffic source from an explicit ?src / utm_source, or the referrer.
function detectSource(src: string | null, referrer: string | null): string {
  const s = (src || "").toLowerCase();
  if (s) {
    if (s.includes("tiktok")) return "tiktok";
    if (s.includes("whatsapp") || s === "wa") return "whatsapp";
    if (s.includes("insta") || s === "ig") return "instagram";
    if (s.includes("face") || s === "fb") return "facebook";
    if (s === "x" || s.includes("twitter")) return "x";
    if (s.includes("google")) return "google";
    if (s.includes("tele")) return "telegram";
    return s;
  }
  const r = (referrer || "").toLowerCase();
  if (!r) return "direct";
  if (r.includes("tiktok")) return "tiktok";
  if (r.includes("whatsapp") || r.includes("wa.me")) return "whatsapp";
  if (r.includes("instagram")) return "instagram";
  if (r.includes("facebook") || r.includes("fb.")) return "facebook";
  if (r.includes("t.co") || r.includes("twitter") || r.includes("x.com")) return "x";
  if (r.includes("google")) return "google";
  if (r.includes("t.me") || r.includes("telegram")) return "telegram";
  if (r.includes("ranceldatahub")) return "direct"; // internal
  return "other";
}

export async function POST(req: NextRequest) {
  try {
    const { type, path, productId, src, referrer } = await req.json();
    if (!["visit", "product_view", "checkout_start"].includes(type)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await prisma.analyticsEvent.create({
      data: { type, path: path || null, productId: productId || null, source: detectSource(src || null, referrer || null) },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 }); // never break the page over analytics
  }
}
