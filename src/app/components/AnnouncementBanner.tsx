"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Announcement = { id: string; title: string; body: string };

export default function AnnouncementBanner() {
  const [latest, setLatest] = useState<Announcement | null>(null);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d: Announcement[]) => {
        if (Array.isArray(d) && d.length > 0) setLatest(d[0]);
      })
      .catch(() => {});
  }, []);

  if (!latest) return null;

  return (
    <div className="border-b border-primary/20 bg-[#EAF1FE]">
      <div className="mx-auto max-w-6xl px-5 py-2.5 text-sm">
        <Link href="/updates" className="block truncate">
          <span className="font-semibold text-primary">{latest.title}</span>
          <span className="ml-2 text-ink/60">{latest.body}</span>
        </Link>
      </div>
    </div>
  );
}
