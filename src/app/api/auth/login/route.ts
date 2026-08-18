import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { emailOrPhone, password } = await req.json();

  if (!emailOrPhone || !password) {
    return NextResponse.json({ error: "Email/phone and password are required." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: emailOrPhone }, { phone: emailOrPhone }] },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
  }

  const token = signSession({ userId: user.id, role: user.role });
  setSessionCookie(token);

  return NextResponse.json({ id: user.id, name: user.name, role: user.role });
}
