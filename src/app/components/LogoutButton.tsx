"use client";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "GET" });
    window.location.href = "/"; // full reload so the server-rendered header re-checks the session
  }

  return (
    <button onClick={handleLogout} className="btn-secondary !px-4 !py-2">
      Log out
    </button>
  );
}
