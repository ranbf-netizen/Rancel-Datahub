"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Megaphone, ArrowRight } from "lucide-react";

type Announcement = { id: string; title: string; body: string };

export default function UpdatePopup() {
  const [latest, setLatest] = useState<Announcement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d: Announcement[]) => {
        if (!Array.isArray(d) || d.length === 0) return;
        const top = d[0];
        let dismissed: string | null = null;
        try {
          dismissed = localStorage.getItem("dismissed-update-popup");
        } catch {}
        if (dismissed !== top.id) {
          setLatest(top);
          // small delay so the entrance animation is noticeable
          setTimeout(() => setShow(true), 400);
        }
      })
      .catch(() => {});
  }, []);

  function close() {
    if (latest) {
      try {
        localStorage.setItem("dismissed-update-popup", latest.id);
      } catch {}
    }
    setShow(false);
  }

  if (!latest) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center px-5 transition-opacity duration-300 ${
        show ? "bg-black/50 opacity-100" : "pointer-events-none opacity-0"
      }`}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-300 ${
          show ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"
        }`}
      >
        {/* Gradient header accent */}
        <div className="h-24 bg-gradient-to-br from-primary to-ink" />

        {/* Floating icon */}
        <div className="absolute left-6 top-14 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-white bg-primary text-white shadow-lg">
          <Megaphone size={26} />
        </div>

        {/* Close button */}
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/30"
        >
          <X size={18} />
        </button>

        <div className="px-6 pb-6 pt-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Latest update</p>
          <h2 className="mt-1 text-xl font-bold text-ink">{latest.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/70">{latest.body}</p>

          <div className="mt-6 flex gap-3">
            <Link
              href="/updates"
              onClick={close}
              className="btn-primary inline-flex flex-1 items-center justify-center gap-2 text-center"
            >
              View all updates <ArrowRight size={16} />
            </Link>
            <button onClick={close} className="btn-secondary">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}