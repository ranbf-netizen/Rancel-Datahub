"use client";

import { useEffect, useState } from "react";
import { Loader2, Eye, MousePointerClick, ShoppingCart, Banknote, TrendingUp } from "lucide-react";

type Stats = {
  days: number; visits: number; productViews: number; checkouts: number;
  sales: number; revenue: number; sources: { source: string; count: number }[];
};

const RANGES = [
  { label: "Today", days: 1 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const SOURCE_LABEL: Record<string, string> = {
  tiktok: "TikTok", whatsapp: "WhatsApp", instagram: "Instagram", facebook: "Facebook",
  x: "X (Twitter)", google: "Google", telegram: "Telegram", direct: "Direct", other: "Other",
};

export default function AdminAnalytics() {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?days=${days}`).then((r) => r.json()).then((d) => { if (!d.error) setStats(d); }).finally(() => setLoading(false));
  }, [days]);

  const maxSource = stats && stats.sources.length ? Math.max(...stats.sources.map((s) => s.count)) : 1;

  return (
    <div>
      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="mt-1 text-sm text-slate">Visits, product interest, checkouts, sales, and where customers come from.</p>

      {/* Date range bar */}
      <div className="mt-4 inline-flex rounded-lg border border-ink/10 p-1">
        {RANGES.map((r) => (
          <button key={r.days} onClick={() => setDays(r.days)} className={`rounded-md px-4 py-1.5 text-sm font-medium ${days === r.days ? "bg-primary text-white" : "text-ink/70 hover:bg-mist"}`}>{r.label}</button>
        ))}
      </div>

      {loading && <p className="mt-6 inline-flex items-center gap-2 text-slate"><Loader2 size={16} className="animate-spin" /> Loading…</p>}

      {stats && !loading && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Metric icon={<Eye size={18} />} label="Visits" value={stats.visits} />
            <Metric icon={<MousePointerClick size={18} />} label="Product views" value={stats.productViews} />
            <Metric icon={<ShoppingCart size={18} />} label="Checkouts started" value={stats.checkouts} />
            <Metric icon={<TrendingUp size={18} />} label="Sales" value={stats.sales} />
            <Metric icon={<Banknote size={18} />} label="Revenue" value={`GH₵ ${stats.revenue.toFixed(2)}`} accent />
          </div>

          <div className="mt-6 card">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Where customers come from</h2>
            {stats.sources.length === 0 ? (
              <p className="mt-3 text-sm text-slate">No visit data yet for this period.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {stats.sources.map((s) => (
                  <div key={s.source}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{SOURCE_LABEL[s.source] || s.source}</span>
                      <span className="text-slate">{s.count}</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-mist">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="mt-4 text-xs text-slate">
            Tip: share links with a <code>?src=</code> tag (e.g. <code>ranceldatahub.shop/shop?src=tiktok</code>) to track exactly where visitors come from. Sources without a tag are detected from the referrer where possible.
          </p>
        </>
      )}
    </div>
  );
}

function Metric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="card">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <p className="mt-2 text-xs uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-0.5 text-xl font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}
