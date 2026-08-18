"use client";

export default function LogoutButton() {
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      // location.replace (not href) skips adding a back-button history entry
      // and forces a genuinely fresh request, bypassing any client-side cache.
      // A cache-busting unique URL guarantees no layer (browser, CDN, etc.)
      // can possibly serve a previously cached version of this page.
      window.location.replace("/?loggedout=" + Date.now());
    }
  }

  return (
    <button onClick={handleLogout} className="btn-secondary !px-4 !py-2">
      Log out
    </button>
  );
}
