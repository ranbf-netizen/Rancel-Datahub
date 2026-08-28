"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

type Money = { revenue: number; profit: number; count: number };
type Stats = {
  today: Money;
  week: Money;
  month: Money;
  daily: { label: string; revenue: number; profit: number }[];
  attention: {
    stuck: number;
    failed: number;
    pendingRefundCount: number;
    pendingWithdrawalCount: number;
    pendingWithdrawalTotal: number;
  };
  commission: { total: number; week: number; agentsEarning: number };
};

export default function AdminOverview() {
  const [wallet, setWallet] = useState<{ balance?: number; low?: boolean; error?: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/admin/wallet").then((r) => r.json()).then(setWallet).catch(() => {});
    fetch("/api/admin/stats").then((r) => r.json()).then((d) => { if (!d.error) setStats(d); }).catch(() => {});
  }, []);

  const maxRev = stats ? Math.max(1, ...stats.daily.map((d) => d.revenue)) : 1;

  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>

      {/* Money stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Today's Revenue" value={money(stats?.today.revenue)} sub={`${stats?.today.count ?? 0} paid orders`} />
        <StatCard label="Today's Profit" value={money(stats?.today.profit)} accent />
        <StatCard label="This Week Revenue" value={money(stats?.week.revenue)} sub={`${stats?.week.count ?? 0} orders`} />
        <StatCard label="This Week Profit" value={money(stats?.week.profit)} accent />
        <StatCard label="This Month Revenue" value={money(stats?.month.revenue)} sub={`${stats?.month.count ?? 0} orders`} />
        <StatCard label="This Month Profit" value={money(stats?.month.profit)} accent />
      </div>

      {/* Weekly chart */}
      <div className="mt-4 card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Last 7 days — revenue</h2>
        <div className="mt-4 flex items-end gap-2" style={{ height: 140 }}>
          {stats?.daily.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-primary/80"
                style={{ height: `${(d.revenue / maxRev) * 110}px`, minHeight: d.revenue > 0 ? 4 : 0 }}
                title={`GH₵ ${d.revenue.toFixed(2)} revenue · GH₵ ${d.profit.toFixed(2)} profit`}
              />
              <span className="text-[10px] text-slate">{d.label}</span>
            </div>
          ))}
          {!stats && <p className="text-sm text-ink/50">Loading…</p>}
        </div>
        <p className="mt-2 text-xs text-slate">Hover a bar to see that day&rsquo;s revenue and profit.</p>
      </div>

      {/* Needs attention */}
      <h2 className="mt-8 text-lg font-semibold">Needs attention</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AttentionCard label="Stuck orders" value={stats?.attention.stuck} hint="Paid but still processing" warn={(stats?.attention.stuck ?? 0) > 0} />
        <AttentionCard label="Failed orders" value={stats?.attention.failed} hint="May need a refund" warn={(stats?.attention.failed ?? 0) > 0} />
        <AttentionCard label="Pending refunds" value={stats?.attention.pendingRefundCount} hint="Owed to customers" warn={(stats?.attention.pendingRefundCount ?? 0) > 0} />
        <AttentionCard
          label="Pending withdrawals"
          value={stats?.attention.pendingWithdrawalCount}
          hint={`GH₵ ${(stats?.attention.pendingWithdrawalTotal ?? 0).toFixed(2)} to pay agents`}
          warn={(stats?.attention.pendingWithdrawalCount ?? 0) > 0}
        />
      </div>

      {/* Agent commissions */}
      <h2 className="mt-8 text-lg font-semibold">Agent commissions</h2>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Commission earned (all time)" value={money(stats?.commission.total)} />
        <StatCard label="Commission this week" value={money(stats?.commission.week)} />
        <StatCard label="Agents earning" value={String(stats?.commission.agentsEarning ?? 0)} sub="via storefront" />
      </div>

      {/* Cledanet balance */}
      <div className="mt-8 card max-w-md">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Balance</h2>
        {!wallet && <p className="mt-2 text-sm text-ink/50">Checking…</p>}
        {wallet?.error && <p className="mt-2 text-sm text-clay">Couldn&rsquo;t check balance — {wallet.error}</p>}
        {wallet?.balance !== undefined && (
          <>
            <p className="mt-2 text-3xl font-bold">GH₵ {wallet.balance.toFixed(2)}</p>
            {wallet.low && (
              <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-red-600">
                <AlertTriangle size={14} /> Balance is low — top up your balance or customer orders will start failing.
              </p>
            )}
          </>
        )}
        <p className="mt-3 text-xs text-ink/50">
          This is your balance on the supplier&rsquo;s platform, separate from what customers pay you. Fund it whenever it runs low.
        </p>
      </div>
    </div>
  );
}

function money(n?: number) {
  return `GH₵ ${(n ?? 0).toFixed(2)}`;
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? "text-primary" : ""}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate">{sub}</p>}
    </div>
  );
}

function AttentionCard({ label, value, hint, warn }: { label: string; value?: number; hint: string; warn?: boolean }) {
  return (
    <div className={`card ${warn ? "border-red-500/30 bg-red-500/5" : ""}`}>
      <p className="text-xs uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${warn ? "text-red-600" : ""}`}>{value ?? "—"}</p>
      <p className="mt-0.5 text-xs text-slate">{hint}</p>
    </div>
  );
}
