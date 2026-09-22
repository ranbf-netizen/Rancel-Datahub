import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [dataOrders, pinOrders] = await Promise.all([
    prisma.dataOrder.findMany({
      include: { user: true, bundle: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.pinOrder.findMany({
      include: { user: true, pin: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return NextResponse.json({ dataOrders, pinOrders });
}
