import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreResponse() {
  const res = NextResponse.json({ loggedOut: true });
  res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return res;
}

export async function POST() {
  clearSessionCookie();
  return noStoreResponse();
}

export async function GET() {
  clearSessionCookie();
  const res = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  res.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  return res;
}