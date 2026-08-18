"use client";

import { useState } from "react";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

type Session = { role: "CUSTOMER" | "ADMIN" } | null;

export default function MobileNav({ session }: { session: Session }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-ink/15"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
          {open ? (
            <path d="M4 4l12 12M16 4L4 16" strokeLinecap="round" />
          ) : (
            <path d="M2 5h16M2 10h16M2 15h16" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-16 z-40 border-b border-ink/10 bg-paper px-5 py-4 shadow-md">
          <nav className="flex flex-col gap-4 text-sm font-medium">
            <Link href="/data" onClick={() => setOpen(false)}>Data Bundles</Link>
            <Link href="/results" onClick={() => setOpen(false)}>Results Checker</Link>
            {session ? (
              <>
                <Link href="/orders" onClick={() => setOpen(false)}>My Orders</Link>
                {session.role === "ADMIN" && (
                  <Link href="/admin" onClick={() => setOpen(false)}>Admin</Link>
                )}
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="btn-primary text-center">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
