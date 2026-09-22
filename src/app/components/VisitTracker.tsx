"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Fires a lightweight "visit" event on each page load, capturing traffic source
// from ?src=/utm_source or the referrer. Best-effort; never blocks the page.
export default function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    // don't track admin pages
    if (pathname?.startsWith("/admin")) return;
    let src: string | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      src = params.get("src") || params.get("utm_source");
    } catch {}
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "visit", path: pathname, src, referrer: document.referrer }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);
  return null;
}
