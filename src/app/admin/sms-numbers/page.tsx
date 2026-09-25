"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, RefreshCw, Wallet, Save, Check, Smartphone } from "lucide-react";

type Order = {
  id: string; customer: string; phone: string;
  countryName: string; serviceName: string; phoneNumber?: string | null; smsCode?: string | null;
  amount: number; paymentStatus: string; status: string; createdAt: string;
};

const LOW_BALANCE = 10; // USD threshold to warn

function StatusPill({ text, tone }: { text: string; tone: "good" | "warn" | "bad" | "muted" }) {
  const cls = tone === "good" ? "bg-primary/10 text-primary" : tone === "warn" ? "bg-amber-500/15 text-amber-700" : tone === "bad" ? "bg-ghRed/10 text-ghRed" : "bg-mist text-ink/60";
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{text}</span>;
}

export default function AdminSmsNumbers() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [markupPct, setMarkupPct] = useState("");
  const [usdToGhs, setUsdToGhs] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/admin/sms-numbers").then((r) => r.json()).then((d) => {
      if (!d.error) {
        setOrders(d.orders || []);
        setBalance(d.balance);
        setBalanceError(d.balanceError);
        if (d.settings) {
          setMarkupPct(String(d.settings.markupPct));
          setUsdToGhs(String(d.settings.usdToGhs));
        }
      }
    }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function saveSettings() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/admin/sms-numbers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markupPct, usdToGhs }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function paymentTone(s: string) { return s === "PAID" ? "good" : "muted"; }
  function statusTone(s: string) {
    if (!s) return "muted";
    const l = s.toLowerCase();
    if (l === "received") return "good";
    if (l.startsWith("failed") || l === "expired") return "bad";
    if (l === "waiting") return "warn";
    return "muted";
  }

  // Live preview of what a $2 number would cost a customer with these settings.
  const previewUsd = 2;
  const previewGhs = markupPct && usdToGhs ? (previewUsd * Number(usdToGhs) * (1 + Number(markupPct) / 100)).toFixed(2) : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">SMS Numbers</h1>
          <p className="mt-1 text-sm text-slate">Rental orders, your SMSPool balance, and pricing.</p>
        </div>
        <button onClick={load} className="btn-secondary inline-flex items-center gap-2 !py-2 !text-sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        {/* Panel balance */}
        <div className="card">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/60">
            <Wallet size={16} /> SMSPool balance
          </p>
          {balanceError ? (
            <p className="mt-2 text-sm text-ghRed">Couldn&rsquo;t fetch balance — {balanceError}</p>
          ) : balance === null ? (
            <p className="mt-2 text-sm text-ink/50">Checking…</p>
          ) : (
            <>
              <p className="mt-2 text-3xl font-bold">${balance.toFixed(2)}</p>
              {balance <= LOW_BALANCE && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                  <AlertTriangle size={14} /> Low balance — top up SMSPool or orders will fail.
                </p>
              )}
            </>
          )}
          <p className="mt-3 text-xs text-ink/50">Customer payments come to your Paystack; number rentals are paid from this balance.</p>
        </div>

        {/* Pricing settings - independent from boosting's markup */}
        <div className="card">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink/60">
            <Smartphone size={16} /> Pricing
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Markup %</label>
              <input className="field" type="number" value={markupPct} onChange={(e) => setMarkupPct(e.target.value)} />
            </div>
            <div>
              <label className="label">USD → GHS rate</label>
              <input className="field" type="number" value={usdToGhs} onChange={(e) => setUsdToGhs(e.target.value)} />
            </div>
          </div>
          {previewGhs && <p className="mt-2 text-xs text-slate">Preview: a $2.00 number would show as GH₵ {previewGhs}</p>}
          <button onClick={saveSettings} disabled={saving} className="btn-primary mt-3 inline-flex items-center gap-2 !py-2 !text-sm disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : <Save size={14} />}
            {saving ? "Saving…" : saved ? "Saved" : "Save pricing"}
          </button>
          <p className="mt-2 text-xs text-ink/50">Separate from your boosting margin — tune this one independently.</p>
        </div>
      </div>

      {/* Orders table */}
      <div className="card mt-6 p-0">
        <div className="border-b border-ink/10 px-5 py-3"><h2 className="font-semibold">SMS number orders</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
                <th className="px-5 py-3">Date</th><th>Customer</th><th>Service</th><th>Country</th><th>Number</th><th>Code</th><th>Amount</th><th>Payment</th><th>Status</th>
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
                  <td className="max-w-[160px] truncate" title={o.serviceName}>{o.serviceName}</td>
                  <td className="whitespace-nowrap">{o.countryName}</td>
                  <td className="whitespace-nowrap font-mono text-xs">{o.phoneNumber || "—"}</td>
                  <td className="whitespace-nowrap font-mono text-xs">{o.smsCode || "—"}</td>
                  <td className="whitespace-nowrap">GH₵ {o.amount.toFixed(2)}</td>
                  <td><StatusPill text={o.paymentStatus} tone={paymentTone(o.paymentStatus)} /></td>
                  <td><StatusPill text={o.status || "—"} tone={statusTone(o.status)} /></td>
                </tr>
              ))}
              {orders.length === 0 && !loading && (
                <tr><td colSpan={9} className="px-5 py-8 text-center text-sm text-slate">No SMS number orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {loading && <p className="px-5 py-4 text-sm text-slate"><Loader2 size={14} className="mr-1 inline animate-spin" /> Loading…</p>}
      </div>
    </div>
  );
}
