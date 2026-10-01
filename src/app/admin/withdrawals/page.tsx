"use client";

import { useEffect, useState } from "react";

type Withdrawal = {
  id: string;
  agentName: string;
  agentPhone: string;
  walletBalance: number;
  amount: number;
  status: string;
  createdAt: string;
};

const PER_PAGE = 10;

export default function AdminWithdrawals() {
  const [rows, setRows] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  function load() {
    setLoading(true);
    fetch("/api/admin/agents/withdrawals")
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function markPaid(id: string) {
    if (!confirm("Confirm you have paid this agent (momo/bank). This marks the request completed.")) return;
    setWorking(id);
    await fetch("/api/admin/agents/withdrawals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setWorking(null);
    load();
  }

  const pending = rows.filter((r) => r.status === "PENDING");
  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const slice = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <h1 className="text-2xl font-bold">Agent Withdrawals</h1>

      {pending.length > 0 && (
        <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700">
          {pending.length} pending request{pending.length > 1 ? "s" : ""} · GH₵{" "}
          {pending.reduce((s, r) => s + r.amount, 0).toFixed(2)} to pay
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
              <th className="py-2">Requested</th><th>Agent</th><th>Phone</th><th>Amount</th><th>Wallet</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => (
              <tr key={r.id} className="border-b border-ink/5">
                <td className="py-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.agentName}</td>
                <td className="whitespace-nowrap">{r.agentPhone}</td>
                <td className="font-semibold">GH₵ {r.amount.toFixed(2)}</td>
                <td className="text-slate">GH₵ {r.walletBalance.toFixed(2)}</td>
                <td>
                  <span className={r.status === "PENDING" ? "text-amber-600" : "text-primary"}>
                    {r.status === "PENDING" ? "Pending" : "Paid"}
                  </span>
                </td>
                <td className="text-right">
                  {r.status === "PENDING" && (
                    <button
                      onClick={() => markPaid(r.id)}
                      disabled={working === r.id}
                      className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-50"
                    >
                      {working === r.id ? "Saving…" : "Mark paid"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="mt-3 text-sm text-slate">Loading…</p>}
        {!loading && rows.length === 0 && <p className="mt-3 text-sm text-slate">No withdrawal requests yet.</p>}
        <Pager page={page} totalPages={totalPages} onChange={setPage} count={rows.length} />
      </div>
    </div>
  );
}

function Pager({ page, totalPages, onChange, count }: { page: number; totalPages: number; onChange: (p: number) => void; count: number }) {
  if (count === 0) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-slate">{count} request{count === 1 ? "" : "s"}</span>
      <div className="flex items-center gap-3">
        <span className="text-slate">Page {page} of {totalPages}</span>
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-40">Prev</button>
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}