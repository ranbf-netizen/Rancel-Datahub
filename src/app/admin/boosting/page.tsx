"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, RefreshCw, Wallet, TrendingUp, Save, Check } from "lucide-react";

type Order = {
  id: string; customer: string; email: string; phone: string;
  serviceName: string; link: string; quantity: number; amount: number;
  paymentStatus: string; panelStatus?: string; panelOrderId?: string; createdAt: string;
};

const PER_PAGE = 10;
const LOW_BALANCE = 20;

// Same status pill styling as the data bundle orders page.
function StatusPill({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  let cls = "bg-mist text-ink/70";
  if (["DELIVERED", "COMPLETED", "PAID", "SUCCESS"].includes(s)) cls = "bg-primary/10 text-primary";
  else if (["PROCESSING", "PENDING", "IN PROGRESS", "PARTIAL"].includes(s)) cls = "bg-amber-500/15 text-amber-700";
  else if (["FAILED", "CANCELLED", "CANCELED", "REJECTED", "REFUNDED"].includes(s)) cls = "bg-ghRed/10 text-ghRed";
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{status || "—"}</span>;
}

export default function AdminBoosting() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [page, setPage] = useState(1);

  const [markupPct, setMarkupPct] = useState("");
  const [exampleCost, setExampleCost] = useState("12.69");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/admin/boosting").then((r) => r.json()).then((d) => {
            if (!d.error) {
        setOrders((d.orders || []).filter((o: any) => o.paymentStatus === "PAID"));
        setBalance(d.balance);
        setBalanceError(d.balanceError);
        if (typeof d.markupPct === "number") setMarkupPct(String(d.markupPct));
      }
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function saveMarkup() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/boosting", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markupPct }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // GainRealGrowth prices in GH₵ already, so this preview takes a real panel
  // cost you type in (e.g. straight off their checkout page) and shows what
  // the customer pays with the current markup - no exchange rate involved.
  const previewPrice = markupPct && exampleCost
    ? (Number(exampleCost) * (1 + Number(markupPct) / 100)).toFixed(2)
    : null;

  async function syncStatuses() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/boosting/sync", { method: "POST" });
      const d = await res.json();
      if (res.ok) { alert(`Synced. ${d.updated} order(s) updated.`); load(); }
      else alert(d.error || "Sync failed.");
    } catch { alert("Sync failed."); }
    setSyncing(false);
  }

  const totalPages = Math.max(1, Math.ceil(orders.length / PER_PAGE));
  const slice = orders.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Social Media Boosting</h1>
          <p className="mt-1 text-sm text-slate">All boosting orders and your panel balance.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-secondary inline-flex items-center gap-2 !py-2 !text-sm">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={syncStatuses} disabled={syncing} className="btn-primary inline-flex items-center gap-2 !py-2 !text-sm disabled:opacity-50">
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} /> {syncing ? "Syncing…" : "Sync statuses"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {/* Panel balance - GainRealGrowth is GH₵-native, so this balance is
            already cedis, not dollars. */}
        <div className="card">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/60">
            <Wallet size={16} /> Panel balance
          </p>
          {balanceError ? (
            <p className="mt-2 text-sm text-ghRed">Couldn&rsquo;t fetch balance — {balanceError}</p>
          ) : balance === null ? (
            <p className="mt-2 text-sm text-ink/50">Checking…</p>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold">GH₵ {balance.toFixed(2)}</p>
              {balance <= LOW_BALANCE && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                  <AlertTriangle size={14} /> Low balance — top up the panel or boost orders will fail.
                </p>
              )}
            </>
          )}
          <p className="mt-3 text-xs text-ink/50">Customer payments come to your Paystack; boosts are paid from this panel balance.</p>
        </div>

        {/* Pricing - markup only. The panel's rate is already in GH₵, so
            there's no exchange-rate field here on purpose. */}
        <div className="card">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/60">
            <TrendingUp size={16} /> Pricing
          </p>
          <div className="mt-3">
            <label className="label">Markup %</label>
            <input className="field" type="number" value={markupPct} onChange={(e) => setMarkupPct(e.target.value)} />
          </div>

          <div className="mt-3 rounded-lg bg-mist p-3">
            <label className="text-xs font-medium text-slate">Check against a real panel price</label>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-slate">GH₵</span>
              <input
                className="field !py-1.5"
                type="number"
                value={exampleCost}
                onChange={(e) => setExampleCost(e.target.value)}
                placeholder="e.g. what GainRealGrowth shows"
              />
            </div>
            {previewPrice && <p className="mt-2 text-sm">Customer pays <span className="font-bold text-primary">GH₵ {previewPrice}</span></p>}
          </div>

          <button onClick={saveMarkup} disabled={saving} className="btn-primary mt-3 inline-flex items-center gap-2 !py-2 !text-sm disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
            {saving ? "Saving…" : saved ? "Saved" : "Save markup"}
          </button>
        </div>
      </div>

      {/* Orders table — same card style as the data bundle orders page */}
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
              {slice.map((o) => (
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
                  <td><StatusPill status={o.paymentStatus} /></td>
                  <td><StatusPill status={o.panelStatus || "—"} /></td>
                </tr>
              ))}
              {slice.length === 0 && !loading && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-slate">No boost orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager page={page} totalPages={totalPages} onChange={setPage} count={orders.length} />
      </div>
    </div>
  );
}

// Same pager as the data bundle orders page.
function Pager({ page, totalPages, onChange, count }: { page: number; totalPages: number; onChange: (p: number) => void; count: number }) {
  return (
    <div className="flex items-center justify-between border-t border-ink/10 px-5 py-3 text-sm">
      <span className="text-slate">{count} order{count === 1 ? "" : "s"}</span>
      <div className="flex items-center gap-3">
        <span className="text-slate">Page {page} of {totalPages}</span>
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-40">Prev</button>
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
