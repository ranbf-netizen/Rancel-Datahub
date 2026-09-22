"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AgentsPage() {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleApply() {
    setApplying(true);
    setStatus(null);
    const res = await fetch("/api/agents/me", { method: "POST" });
    const data = await res.json();
    setApplying(false);

    if (res.status === 401) {
      router.push("/login?next=/agents");
      return;
    }
    if (!res.ok) {
      setStatus(data.error || "Something went wrong.");
      return;
    }
    router.push("/agent");
  }

  return (
    <div>
      <section className="bg-ink">
        <div className="mx-auto max-w-3xl px-5 py-24 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">RanCel Agents</p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">Turn Data Into a Business</h1>
          <p className="mt-4 text-white/60">
            Buy bundles at reseller pricing, sell to your own customers at whatever price you set,
            and keep the difference. Track every sale from a dashboard built for you.
          </p>
          <div className="mt-8">
            <button onClick={handleApply} className="btn-primary !bg-white !text-ink hover:!bg-white/90" disabled={applying}>
              {applying ? "Applying…" : "Become a RanCel Agent"}
            </button>
          </div>
          {status && <p className="mt-3 text-sm text-ghRed">{status}</p>}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-16">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Benefit title="Reseller pricing" desc="Buy bundles below normal retail price, straight from your wallet." />
          <Benefit title="Set your own prices" desc="Charge your customers whatever works for your market and keep the profit." />
          <Benefit title="Track everything" desc="Every sale, every profit margin, logged automatically in your dashboard." />
          <Benefit title="Simple wallet top-ups" desc="Fund your wallet anytime via Paystack — mobile money or card." />
          <Benefit title="Withdraw earnings" desc="Request a payout anytime; we settle it directly to you." />
          <Benefit title="No monthly fees" desc="Only pay for the bundles you actually buy to resell." />
        </div>
      </section>

      <section className="border-t border-ink/10 bg-mist">
        <div className="mx-auto max-w-2xl px-5 py-16 text-center">
          <h2 className="text-2xl font-bold">How it works</h2>
          <div className="mt-6 grid gap-4 text-left sm:grid-cols-2">
            <Step n="1" text="Apply and get approved as a RanCel Agent." />
            <Step n="2" text="Top up your wallet via Paystack." />
            <Step n="3" text="Sell bundles to your customers at reseller cost." />
            <Step n="4" text="Track profit and withdraw earnings anytime." />
          </div>
        </div>
      </section>
    </div>
  );
}

function Benefit({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="card">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-slate">{desc}</p>
    </div>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{n}</span>
      <p className="text-sm text-ink/80">{text}</p>
    </div>
  );
}
