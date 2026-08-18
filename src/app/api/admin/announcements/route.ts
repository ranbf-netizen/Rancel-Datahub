import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function requireAdmin() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

// GET: list all announcements (admin view - includes inactive ones)
export async function GET() {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(announcements);
}

// POST: create a new announcement
export async function POST(req: NextRequest) {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { title, body } = await req.json();

  if (!title || !body) {
    return NextResponse.json({ error: "Title and message are required." }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({ data: { title, body } });
  return NextResponse.json(announcement);
}

// PATCH: edit or toggle active status
export async function PATCH(req: NextRequest) {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, title, body, active } = await req.json();

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(body !== undefined ? { body } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });

  return NextResponse.json(announcement);
}

// DELETE: remove an announcement permanently
export async function DELETE(req: NextRequest) {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}