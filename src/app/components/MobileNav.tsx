"use client";

import { useState } from "react";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import {
  Menu, X, Wifi, PackageSearch, UserPlus, GraduationCap, Sprout,
  Megaphone, Sparkles, ShoppingBag, LayoutDashboard, Shield, LogIn, UserRoundPlus,
} from "lucide-react";

type Session = { role: "CUSTOMER" | "ADMIN" } | null;

export default function MobileNav({ session }: { session: Session }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const link = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-ink hover:bg-mist";

  return (
    <div className="lg:hidden">
      {/* Hamburger button */}
      <button
        aria-label="Menu"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-ink/15"
      >
        <Menu size={20} />
      </button>

      {/* Dark overlay — fades in */}
      <div
        onClick={close}
        className={`fixed inset-0 z-[90] bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer — slides in from the LEFT */}
      <div
        className={`fixed left-0 top-0 z-[91] h-full w-72 max-w-[85%] overflow-y-auto bg-white px-5 py-5 shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-lg font-bold text-ink">
            RanCel <span className="text-primary">DataHub</span>
          </span>
          <button
            aria-label="Close"
            onClick={close}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-ink/15"
          >
            <X size={18} />
          </button>
        </div>

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
    </div>
  );
}