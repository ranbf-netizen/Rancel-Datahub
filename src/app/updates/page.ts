"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export default function UpdatesPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d) => setAnnouncements(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Updates</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">What's new</h1>
      <p className="mt-2 text-slate">Service updates, maintenance notices, and new features.</p>

      <div className="mt-8 space-y-4">
        {loading && <p className="text-sm text-slate">Loading…</p>}
        {!loading && announcements.length === 0 && (
          <p className="rounded-xl border border-dashed border-ink/15 p-6 text-sm text-slate">
            No updates right now — check back later.
          </p>
        )}
        {announcements.map((a) => (
          <div key={a.id} className="card">
            <p className="font-semibold">{a.title}</p>
            <p className="mt-2 text-sm text-slate">{a.body}</p>
            <p className="mt-3 text-xs text-slate">{new Date(a.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}