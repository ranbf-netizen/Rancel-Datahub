"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";

export default function AdminBulkSms() {
  const [message, setMessage] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/bulk-sms").then((r) => r.json()).then((d) => { if (!d.error) setCount(d.count); }).catch(() => {});
  }, []);

  const pages = Math.max(1, Math.ceil(message.length / 160));

  async function send() {
    if (!message.trim()) return;
    if (!confirm(`Send this message to ${count ?? "all"} customers? This will use your SMS balance.`)) return;
    setSending(true);
    setResult(null);
    const res = await fetch("/api/admin/bulk-sms", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }),
    });
    const d = await res.json();
    setSending(false);
    if (!res.ok) { setResult(d.error || "Failed to send."); return; }
    setResult(`Sent to ${d.sent} of ${d.recipients} recipients${d.failedBatches ? ` (${d.failedBatches} batch(es) failed)` : ""}.`);
    setMessage("");
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Bulk SMS</h1>
      <p className="mt-1 text-sm text-slate">Send a message to all your customers (registered users + guest order numbers, deduplicated).</p>

      <div className="card mt-6 max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">
          <MessageSquare size={16} /> {count === null ? "Counting recipients…" : `${count} customers will receive this`}
        </div>

        <label className="label mt-4">Message</label>
        <textarea
          className="field"
          rows={5}
          placeholder="Type your message to customers…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate">{message.length} characters · {pages} SMS page{pages > 1 ? "s" : ""} per recipient</p>

        {result && <p className="mt-3 text-sm font-medium text-primary">{result}</p>}

        <button onClick={send} disabled={sending || !message.trim()} className="btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-50">
          {sending && <Loader2 size={16} className="animate-spin" />}
          {sending ? "Sending…" : "Send to all customers"}
        </button>
      </div>

      <div className="card mt-6 max-w-xl bg-mist text-sm text-slate">
        <p className="font-semibold text-ink">Before you send</p>
        <ul className="mt-2 space-y-1">
          <li>• Each SMS costs money from your Arkesel balance. {count ? `${count} recipients × ${pages} page(s).` : ""}</li>
          <li>• Longer messages (over 160 characters) count as multiple SMS pages per recipient.</li>
          <li>• Send order updates and useful info — avoid spam so customers don&rsquo;t opt out.</li>
        </ul>
      </div>
    </div>
  );
}