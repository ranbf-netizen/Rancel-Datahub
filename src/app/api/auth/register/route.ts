import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signSession, setSessionCookie } from "@/lib/auth";
import { checkEmail } from "@/lib/validateEmail";

export async function POST(req: NextRequest) {
  const { name, email, phone, password } = await req.json();

  if (!name || !email || !phone || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  // Hard server-side check - the frontend already warns about typos, but
  // never trust client-side validation alone (someone could call this route
  // directly). A genuinely malformed email is rejected outright; a likely
  // typo on a well-known domain is just normalized away from here on, since
  // we can't ask the user for confirmation at this layer.
  const emailResult = checkEmail(email);
  if (!emailResult.valid) {
    return NextResponse.json({ error: "That email address doesn't look valid - please double check it." }, { status: 400 });
  }
  const cleanEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: cleanEmail }, { phone }] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email or phone already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email: cleanEmail, phone, passwordHash },
  });

  const token = signSession({ userId: user.id, role: user.role });
  setSessionCookie(token);

  return NextResponse.json({ id: user.id, name: user.name, role: user.role });
}
