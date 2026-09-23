"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, RefreshCw, Wallet } from "lucide-react";

type Order = {
  id: string; customer: string; email: string; phone: string;
  serviceName: string; link: string; quantity: number; amount: number;
  paymentStatus: string; panelStatus?: string; panelOrderId?: string; createdAt: string;
};

const LOW_BALANCE = 20; // GHS/USD threshold to warn

function StatusPill({ text, tone }: { text: string; tone: "good" | "warn" | "bad" | "muted" }) {
  const cls = tone === "good" ? "bg-primary/10 text-primary" : tone === "warn" ? "bg-amber-500/15 text-amber-700" : tone === "bad" ? "bg-ghRed/10 text-ghRed" : "bg-mist text-ink/60";
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{text}</span>;
}

export default function AdminBoosting() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/admin/boosting").then((r) => r.json()).then((d) => {
      if (!d.error) { setOrders(d.orders || []); setBalance(d.balance); setBalanceError(d.balanceError); }
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  function paymentTone(s: string) { return s === "PAID" ? "good" : "muted"; }
  function panelTone(s?: string) {
    if (!s) return "muted";
    const l = s.toLowerCase();
    if (l.includes("complete")) return "good";
    if (l.startsWith("failed")) return "bad";
    if (l.includes("partial") || l.includes("progress") || l.includes("pending")) return "warn";
    return "muted";
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Media Boosting</h1>
          <p className="mt-1 text-sm text-slate">All boosting orders and your panel balance.</p>
        </div>
        <button onClick={load} className="btn-secondary inline-flex items-center gap-2 !py-2 !text-sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Panel balance */}
      <div className="card mt-6 max-w-sm">
        <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/60">
          <Wallet size={16} /> Panel balance
        </p>
        {balanceError ? (
          <p className="mt-2 text-sm text-ghRed">Couldn&rsquo;t fetch balance — {balanceError}</p>
        ) : balance === null ? (
          <p className="mt-2 text-sm text-ink/50">Checking…</p>
        ) : (
          <>
            <p className="mt-2 text-3xl font-bold">{balance.toFixed(2)}</p>
            {balance <= LOW_BALANCE && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                <AlertTriangle size={14} /> Low balance — top up gainrealgrowth or boost orders will fail.
              </p>
            )}
          </>
        )}
        <p className="mt-3 text-xs text-ink/50">This is your gainrealgrowth balance. Customer payments come to your Paystack; boosts are paid from this panel balance.</p>
      </div>

      {/* Orders table */}
      <div className="card mt-6 p-0">
        <div className="border-b border-ink/10 px-5 py-3"><h2 className="font-semibold">Boost orders</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
                <th className="px-5 py-3">Date</th><th>Customer</th><th>Service</th><th>Link</th><th>Qty</th><th>Amount</th><th>Payment</th><th>Panel status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-ink/5 hover:bg-mist/50">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-slate">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="whitespace-nowrap">
                    <span className="block font-medium">{o.customer}</span>
                    <span className="block text-xs text-slate">{o.phone}</span>
                  </td>
                  <td className="max-w-[220px] truncate" title={o.serviceName}>{o.serviceName}</td>
                  <td className="max-w-[180px] truncate"><a href={o.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" title={o.link}>{o.link}</a></td>
                  <td>{o.quantity}</td>
                  <td className="whitespace-nowrap">GH₵ {o.amount.toFixed(2)}</td>
                  <td><StatusPill text={o.paymentStatus} tone={paymentTone(o.paymentStatus)} /></td>
                  <td><StatusPill text={o.panelStatus || "—"} tone={panelTone(o.panelStatus)} /></td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-slate">No boost orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {loading && <p className="px-5 py-4 text-sm text-slate"><Loader2 size={14} className="mr-1 inline animate-spin" /> Loading…</p>}
      </div>
    </div>
  );
}
