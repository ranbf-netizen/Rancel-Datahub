"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

type Order = {
  id: string; product: string; productType: string; deliveryType: string;
  email: string; whatsapp: string; option: string; deliveryMethod: string; note: string;
  amount: number; paymentStatus: string; createdAt: string;
};

const PER_PAGE = 10;

// Same pill styling as the data bundle orders page.
function StatusPill({ status }: { status: string }) {
  const s = (status || "").toUpperCase();
  let cls = "bg-mist text-ink/70";
  if (["PAID", "DELIVERED", "COMPLETED", "SUCCESS"].includes(s)) cls = "bg-primary/10 text-primary";
  else if (["PENDING", "PROCESSING"].includes(s)) cls = "bg-amber-500/15 text-amber-700";
  else if (["FAILED", "CANCELLED", "REFUNDED"].includes(s)) cls = "bg-ghRed/10 text-ghRed";
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{status || "—"}</span>;
}

export default function AdminShopOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyManual, setOnlyManual] = useState(false);
  const [page, setPage] = useState(1);

  function load() {
    setLoading(true);
    fetch("/api/admin/shop-orders").then((r) => r.json()).then((d) => { if (!d.error) setOrders((d.orders || []).filter((o: any) => o.paymentStatus === "PAID")); }).finally(() => setLoading(false));
  }
  useEffect(load, []);

  const filtered = onlyManual
    ? orders.filter((o) => o.deliveryType === "MANUAL" || o.deliveryMethod === "ACTIVATION" || o.whatsapp)
    : orders;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // reset to page 1 when the filter changes
  useEffect(() => { setPage(1); }, [onlyManual]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Shop Orders</h1>
          {/*<p className="mt-1 text-sm text-slate">Digital product orders. Manual/activation orders show the customer&rsquo;s WhatsApp so you can fulfil them.</p>*/}
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
        <div className="border-b border-ink/10 px-5 py-3"><h2 className="font-semibold">Orders</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
                <th className="px-5 py-3">Date</th><th>Product</th><th>Option</th><th>Delivery</th><th>Email</th><th>WhatsApp</th><th>Amount</th><th>Payment</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((o) => (
                <tr key={o.id} className="border-b border-ink/5 hover:bg-mist/50">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-slate">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="max-w-[200px] truncate" title={o.product}>{o.product}</td>
                  <td>{o.option || "—"}</td>
                  <td className="whitespace-nowrap text-xs">{o.deliveryMethod || o.deliveryType || "—"}</td>
                  <td className="whitespace-nowrap">{o.email}</td>
                  <td className="whitespace-nowrap font-medium">
                    {o.whatsapp
                      ? <a href={`https://wa.me/${o.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-[#25D366] hover:underline">{o.whatsapp}</a>
                      : <span className="text-slate">—</span>}
                  </td>
                  <td className="whitespace-nowrap">GH₵ {o.amount.toFixed(2)}</td>
                  <td><StatusPill status={o.paymentStatus} /></td>
                </tr>
              ))}
              {slice.length === 0 && !loading && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-slate">No orders{onlyManual ? " needing manual fulfilment" : ""} yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager page={page} totalPages={totalPages} onChange={setPage} count={filtered.length} />
      </div>
      {loading && <p className="mt-3 text-sm text-slate"><Loader2 size={14} className="mr-1 inline animate-spin" /> Loading…</p>}
    </div>
  );
}

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
