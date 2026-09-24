"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

type Order = {
  id: string; product: string; productType: string; deliveryType: string;
  email: string; whatsapp: string; option: string; deliveryMethod: string; note: string;
  amount: number; paymentStatus: string; createdAt: string;
};

function StatusPill({ s }: { s: string }) {
  const cls = s === "PAID" ? "bg-primary/10 text-primary" : "bg-mist text-ink/60";
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{s}</span>;
}

export default function AdminShopOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyManual, setOnlyManual] = useState(false);

  function load() {
    setLoading(true);
    fetch("/api/admin/shop-orders").then((r) => r.json()).then((d) => { if (!d.error) setOrders(d.orders || []); }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  const rows = onlyManual
    ? orders.filter((o) => o.deliveryType === "MANUAL" || o.deliveryMethod === "ACTIVATION" || o.whatsapp)
    : orders;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shop Orders</h1>
          <p className="mt-1 text-sm text-slate">Digital product orders. Manual/activation orders show the customer&rsquo;s WhatsApp so you can fulfil them.</p>
        </div>
        <button onClick={load} className="btn-secondary inline-flex items-center gap-2 !py-2 !text-sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <label className="mt-4 inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyManual} onChange={(e) => setOnlyManual(e.target.checked)} />
        Show only orders needing manual fulfilment
      </label>

      <div className="card mt-4 p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
                <th className="px-5 py-3">Date</th><th>Product</th><th>Option</th><th>Delivery</th><th>Email</th><th>WhatsApp</th><th>Amount</th><th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-ink/5 hover:bg-mist/50">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-slate">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="max-w-[200px] truncate" title={o.product}>{o.product}</td>
                  <td>{o.option || "—"}</td>
                  <td className="whitespace-nowrap text-xs">
                    {o.deliveryMethod || o.deliveryType || "—"}
                  </td>
                  <td className="whitespace-nowrap">{o.email}</td>
                  <td className="whitespace-nowrap font-medium">
                    {o.whatsapp
                      ? <a href={`https://wa.me/${o.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:underline">{o.whatsapp}</a>
                      : <span className="text-slate">—</span>}
                  </td>
                  <td className="whitespace-nowrap">GH₵ {o.amount.toFixed(2)}</td>
                  <td><StatusPill s={o.paymentStatus} /></td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-slate">No orders{onlyManual ? " needing manual fulfilment" : ""} yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {loading && <p className="px-5 py-4 text-sm text-slate"><Loader2 size={14} className="mr-1 inline animate-spin" /> Loading…</p>}
      </div>
    </div>
  );
}
