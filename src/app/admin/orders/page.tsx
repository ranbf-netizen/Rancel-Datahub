"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const PER_PAGE = 10;

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  let cls = "bg-mist text-ink/70";
  if (["DELIVERED", "COMPLETED", "PAID", "SUCCESS"].includes(s)) cls = "bg-primary/10 text-primary";
  else if (["PROCESSING", "PENDING"].includes(s)) cls = "bg-amber-500/15 text-amber-700";
  else if (["FAILED", "CANCELLED", "REJECTED", "REFUNDED"].includes(s)) cls = "bg-ghRed/10 text-ghRed";
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{status}</span>;
}

export default function AdminOrdersPage() {
  const [dataOrders, setDataOrders] = useState<any[]>([]);
  const [checkingDelivery, setCheckingDelivery] = useState<string | null>(null);
  const [dataPage, setDataPage] = useState(1);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/admin/orders").then((r) => r.json()).then((d) => {
      // Only show PAID orders (hide failed/pending).
      setDataOrders((d.dataOrders || []).filter((o: any) => o.paymentStatus === "PAID"));
    }).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function checkDelivery(orderId: string) {
    setCheckingDelivery(orderId);
    const res = await fetch("/api/admin/orders/check-delivery", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId }),
    });
    const data = await res.json();
    setCheckingDelivery(null);
    if (!res.ok) { alert(data.error || "Could not check delivery."); return; }
    alert(`Cledanet says: ${data.supplierStatus}`);
    load();
  }

  const dataTotalPages = Math.max(1, Math.ceil(dataOrders.length / PER_PAGE));
  const dataSlice = dataOrders.slice((dataPage - 1) * PER_PAGE, dataPage * PER_PAGE);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="mt-1 text-sm text-slate">Paid data bundle orders.</p>
        </div>
        <button onClick={load} className="btn-secondary inline-flex items-center gap-2 !py-2 !text-sm">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Data Bundle Orders */}
      <div className="card mt-6 p-0">
        <div className="border-b border-ink/10 px-5 py-3">
          <h2 className="font-semibold">Data Bundle Orders</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
                <th className="px-5 py-3">Date</th><th>Customer</th><th>Bundle</th><th>Recipient</th><th>Amount</th><th>Payment</th><th>Fulfillment</th><th className="px-5">Action</th>
              </tr>
            </thead>
            <tbody>
              {dataSlice.map((o) => (
                <tr key={o.id} className="border-b border-ink/5 hover:bg-mist/50">
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-slate">{new Date(o.createdAt).toLocaleString()}</td>
                  <td>{o.user ? o.user.name : <span className="text-slate">Guest · {o.beneficiaryNumber}</span>}</td>
                  <td className="whitespace-nowrap font-medium">{o.bundle.dataSizeGb}GB {o.bundle.network.toUpperCase()}</td>
                  <td className="whitespace-nowrap">{o.beneficiaryNumber}</td>
                  <td className="whitespace-nowrap">GH₵ {o.amount.toFixed(2)}</td>
                  <td><StatusPill status={o.paymentStatus} /></td>
                  <td><StatusPill status={o.fulfillmentStatus} /></td>
                  <td className="px-5">
                    {o.paymentStatus === "PAID" && o.fulfillmentStatus === "PROCESSING" && (
                      <button
                        className="inline-flex items-center gap-1.5 rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-50"
                        disabled={checkingDelivery === o.id}
                        onClick={() => checkDelivery(o.id)}
                      >
                        <RefreshCw size={12} className={checkingDelivery === o.id ? "animate-spin" : ""} />
                        {checkingDelivery === o.id ? "Checking…" : "Check delivery"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {dataSlice.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-6 text-center text-sm text-slate">No paid orders.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pager page={dataPage} totalPages={dataTotalPages} onChange={setDataPage} count={dataOrders.length} />
      </div>
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