"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

type Announcement = { id: string; title: string; body: string };

export default function AnnouncementBanner() {
  const [latest, setLatest] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(true); // start hidden until we check

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d: Announcement[]) => {
        if (!Array.isArray(d) || d.length === 0) return;
        const top = d[0];
        setLatest(top);
        // Only show if this specific update hasn't been dismissed before.
        const dismissedId = localStorage.getItem("dismissed-announcement");
        setDismissed(dismissedId === top.id);
      })
      .catch(() => {});
  }, []);

  if (!latest || dismissed) return null;

  return (
    <div className="border-b border-primary/20 bg-primary/5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-2.5 text-sm">
        <Link href="/updates" className="flex-1 truncate">
          <span className="font-semibold text-primary">{latest.title}</span>
          <span className="ml-2 text-ink/60">{latest.body}</span>
        </Link>
        <button
          onClick={() => {
            localStorage.setItem("dismissed-announcement", latest.id);
            setDismissed(true);
          }}
          aria-label="Dismiss"
          className="shrink-0 text-ink/40 hover:text-ink"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
