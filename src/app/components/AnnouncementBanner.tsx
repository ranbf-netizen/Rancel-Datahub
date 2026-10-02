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
      <style>{`
        @keyframes rdh-ann-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .rdh-ann-track { animation: rdh-ann-marquee 25s linear infinite; }
        .rdh-ann-track:hover { animation-play-state: paused; }
      `}</style>

      <Link href="/updates" className="flex items-center gap-3 py-2.5 text-sm">
        {/* Fixed title */}
        <span className="shrink-0 whitespace-nowrap px-4 font-semibold text-primary">
          {latest.title}
        </span>

        {/* Scrolling body */}
        <div className="flex-1 overflow-hidden">
          <div className="rdh-ann-track flex w-max whitespace-nowrap text-ink/60">
            {[0, 1].map((dup) => (
              <span key={dup} className="px-8">{latest.body}</span>
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}