"use client";

export default function LogoutButton() {
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      window.location.replace("/");
    }
  }

  return (
    <button onClick={handleLogout} className="btn-secondary !px-4 !py-2">
      Log out
    </button>
  );
}