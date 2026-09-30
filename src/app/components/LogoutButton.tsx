"use client";

import { LogOut } from "lucide-react";

export default function LogoutButton() {
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      window.location.replace("/?loggedout=" + Date.now());
    }
  }

  return (
    <button onClick={handleLogout} className="btn-secondary inline-flex items-center gap-1.5 !px-4 !py-2">
      <LogOut size={15} /> Log out
    </button>
  );
}