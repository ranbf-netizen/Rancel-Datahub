import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Returns the logged-in user's AI credit balance (null if not logged in).
export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ loggedIn: false, credits: null });
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { aiCredits: true } });
  return NextResponse.json({ loggedIn: true, credits: user?.aiCredits ?? 0 });
}
