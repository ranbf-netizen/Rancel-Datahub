"use client";

import { useState } from "react";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import {
  Menu, X, Wifi, PackageSearch, UserPlus, GraduationCap, Sprout,
  Megaphone, Sparkles, ShoppingBag, LayoutDashboard, Shield, LogIn, UserRoundPlus,
} from "lucide-react";

type Session = { role: "CUSTOMER" | "ADMIN" } | null;

// Dead-simple dropdown: it renders in normal document flow (no `fixed`, no
// z-index tricks, nothing that can be "trapped" by a sticky/overflow parent).
// It simply drops down under the header. Reliable everywhere.
export default function MobileNav({ session }: { session: Session }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const link = "flex items-center gap-3 rounded-lg px-2 py-2.5 text-ink hover:bg-mist";

  return (
    <div className="lg:hidden">
      <button
        aria-label="Menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-ink/15"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-ink/10 bg-white px-5 py-3 shadow-lg">
          <nav className="flex flex-col gap-0.5 text-sm font-medium">
            <Link href="/data" onClick={close} className={link}><Wifi size={18} className="text-primary" /> Buy Data</Link>
            <Link href="/track" onClick={close} className={link}><PackageSearch size={18} className="text-primary" /> Track Order</Link>
            <Link href="/agents" onClick={close} className={link}><UserPlus size={18} className="text-primary" /> Become an Agent</Link>
            <Link href="/results" onClick={close} className={link}><GraduationCap size={18} className="text-primary" /> Results Checker</Link>
            <Link href="/afa" onClick={close} className={link}><Sprout size={18} className="text-primary" /> AFA Registration</Link>
            <Link href="/updates" onClick={close} className={link}><Megaphone size={18} className="text-primary" /> Updates</Link>
            <Link href="/tools" onClick={close} className={link}><Sparkles size={18} className="text-primary" /> AI Tools</Link>
            <Link href="/shop" onClick={close} className={link}><ShoppingBag size={18} className="text-primary" /> Shop</Link>
            {session ? (
              <>
                <Link href="/orders" onClick={close} className={link}><ShoppingBag size={18} className="text-primary" /> My Orders</Link>
                <Link href="/agent" onClick={close} className={link}><LayoutDashboard size={18} className="text-primary" /> Agent Dashboard</Link>
                {session.role === "ADMIN" && (
                  <Link href="/admin" onClick={close} className={link}><Shield size={18} className="text-primary" /> Admin</Link>
                )}
                <div className="pt-1"><LogoutButton /></div>
              </>
            ) : (
              <>
                <Link href="/login" onClick={close} className={link}><LogIn size={18} className="text-primary" /> Log in</Link>
                <Link href="/register" onClick={close} className="btn-primary mt-1 flex items-center justify-center gap-2">
                  <UserRoundPlus size={16} /> Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </div>
  );
}
