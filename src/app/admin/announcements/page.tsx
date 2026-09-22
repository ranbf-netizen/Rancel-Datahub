"use client";

import { useEffect, useState } from "react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  createdAt: string;
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/admin/announcements").then((r) => r.json()).then((d) => setAnnouncements(Array.isArray(d) ? d : []));
  }

  useEffect(load, []);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPosting(true);
    const res = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const data = await res.json();
    setPosting(false);
    if (!res.ok) {
      setError(data.error || "Could not post update.");
      return;
    }
    setTitle("");
    setBody("");
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/admin/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this update permanently?")) return;
    await fetch("/api/admin/announcements", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Updates</h1>
      <p className="mt-1 text-sm text-slate">
        Post updates for customers to see — maintenance notices, new features, service issues.
        Active updates show on the public Updates page.
      </p>

      <form onSubmit={handlePost} className="card mt-6 max-w-lg space-y-3">
        <div>
          <label className="label">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="field" required />
        </div>
        <div>
          <label className="label">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} className="field h-28" required />
        </div>
        {error && <p className="text-sm text-ghRed">{error}</p>}
        <button className="btn-primary w-full" disabled={posting}>
          {posting ? "Posting…" : "Post Update"}
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold">All Updates</h2>
      <div className="mt-3 space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{a.title}</p>
                <p className="mt-1 text-sm text-slate">{a.body}</p>
                <p className="mt-2 text-xs text-slate">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist"
                  onClick={() => toggleActive(a.id, a.active)}
                >
                  {a.active ? "Hide" : "Show"}
                </button>
                <button
                  className="rounded-md border border-ghRed/30 px-3 py-1 text-xs font-medium text-ghRed hover:bg-ghRed/5"
                  onClick={() => remove(a.id)}
                >
                  Delete
                </button>
              </div>
            </div>
            {!a.active && <p className="mt-2 text-xs text-slate">Hidden from customers</p>}
          </div>
        ))}
        {announcements.length === 0 && <p className="text-sm text-slate">No updates posted yet.</p>}
      </div>
    </div>
  );
}
