import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = getSession();
  if (!session) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const orders = await prisma.pinOrder.findMany({
    where: { userId: session.userId },
    include: { pin: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}
