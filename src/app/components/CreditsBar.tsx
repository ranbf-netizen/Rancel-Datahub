"use client";

import { useEffect, useState } from "react";
import { Loader2, Coins } from "lucide-react";

// Shows the logged-in user's AI credit balance and a top-up button. For guests
// it invites them to sign up. Rendered at the top of the AI tools page.
export default function CreditsBar() {
  const [state, setState] = useState<{ loggedIn: boolean; credits: number | null } | null>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    fetch("/api/ai-credits/me").then((r) => r.json()).then(setState).catch(() => {});
  }, []);

  async function buy() {
    setBuying(true);
    try {
      const res = await fetch("/api/ai-credits/buy", { method: "POST" });
      const data = await res.json();
      if (data.authorizationUrl) { window.location.href = data.authorizationUrl; return; }
    } catch {}
    setBuying(false);
  }

  if (!state) return null;

  if (!state.loggedIn) {
    return (
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-ink/80">Sign up to get <span className="font-semibold">5 free credits</span> and start using the tools.</p>
        <a href="/register" className="btn-primary !py-2 !text-sm">Sign up free</a>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-mist p-4">
      <p className="inline-flex items-center gap-2 text-sm font-medium text-ink">
        <Coins size={18} className="text-primary" />
        You have <span className="font-bold">{state.credits}</span> credit{state.credits === 1 ? "" : "s"}
      </p>
      <button onClick={buy} disabled={buying} className="btn-primary inline-flex items-center gap-2 !py-2 !text-sm disabled:opacity-50">
        {buying && <Loader2 size={14} className="animate-spin" />}
        {buying ? "Starting…" : "Top up — 10 credits for GH₵ 5"}
      </button>
    </div>
  );
}
