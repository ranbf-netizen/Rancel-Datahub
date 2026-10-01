"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  fullName: string;
  phoneNumber: string;
  town: string;
  occupation: string;
  amount: number;
  paymentStatus: string;
  supplierStatus: string | null;
  failureReason: string | null;
  createdAt: string;
  user: { name: string } | null;
  agent: { user: { name: string } } | null;
};

const PER_PAGE = 10;

export default function AdminAfaPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [page, setPage] = useState(1);

  function load() {
    fetch("/api/admin/afa")
      .then((r) => r.json())
      .then((d) => {
        setOrders(d.orders || []);
        setPrice(String(d.price ?? ""));
      });
  }

  useEffect(load, []);

  async function savePrice(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setSaving(true);
    const res = await fetch("/api/admin/afa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: Number(price) }),
    });
    setSaving(false);
    if (!res.ok) {
      setMsg("Could not update price.");
      return;
    }
    setMsg("Price updated.");
    load();
  }

  const totalPages = Math.max(1, Math.ceil(orders.length / PER_PAGE));
  const slice = orders.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <h1 className="text-2xl font-bold">AFA Registrations</h1>

      <form onSubmit={savePrice} className="card mt-6 max-w-sm">
        <p className="text-sm font-semibold">AFA Price</p>
        <p className="mt-1 text-xs text-slate">Charged to agents per offer, and to direct customers if they register.</p>
        <div className="mt-3 flex gap-2">
          <input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="field"
            required
          />
          <button className="btn-primary shrink-0" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        </div>
        {msg && <p className="mt-2 text-sm text-primary">{msg}</p>}
      </form>

      <h2 className="mt-8 text-lg font-semibold">All Registrations</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
              <th className="py-2">Customer</th><th>Phone</th><th>Source</th><th>Amount</th><th>Payment</th><th>Supplier status</th><th>Issue</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((o) => (
              <tr key={o.id} className="border-b border-ink/5">
                <td className="py-2">{o.fullName}</td>
                <td>{o.phoneNumber}</td>
                <td>{o.agent ? `Agent: ${o.agent.user.name}` : o.user ? o.user.name : "Guest"}</td>
                <td>GH₵ {o.amount.toFixed(2)}</td>
                <td>{o.paymentStatus}</td>
                <td>{o.supplierStatus || "—"}</td>
                <td className="max-w-[200px] whitespace-normal break-words text-xs text-ghRed">{o.failureReason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <p className="mt-3 text-sm text-slate">No AFA registrations yet.</p>}
        <Pager page={page} totalPages={totalPages} onChange={setPage} count={orders.length} />
      </div>
    </div>
  );
}

function Pager({ page, totalPages, onChange, count }: { page: number; totalPages: number; onChange: (p: number) => void; count: number }) {
  if (count === 0) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-slate">{count} registration{count === 1 ? "" : "s"}</span>
      <div className="flex items-center gap-3">
        <span className="text-slate">Page {page} of {totalPages}</span>
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-40">Prev</button>
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}