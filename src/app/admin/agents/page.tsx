"use client";

import { useEffect, useState } from "react";

type Agent = {
  id: string;
  status: string;
  walletBalance: number;
  earningsBalance: number;
  discountPercent: number;
  user: { name: string; email: string; phone: string };
};

type Withdrawal = {
  id: string;
  amount: number;
  createdAt: string;
  agent: { user: { name: string; phone: string } };
};

const PER_PAGE = 10;

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [page, setPage] = useState(1);

  function load() {
    fetch("/api/admin/agents").then((r) => r.json()).then((d) => {
      setAgents(d.agents || []);
      setWithdrawals(d.pendingWithdrawals || []);
    });
  }

  useEffect(load, []);

  async function updateAgent(id: string, body: Record<string, unknown>) {
    await fetch("/api/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    load();
  }

  async function markWithdrawalPaid(id: string) {
    await fetch("/api/admin/agents/withdrawals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const totalPages = Math.max(1, Math.ceil(agents.length / PER_PAGE));
  const slice = agents.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div>
      <h1 className="text-2xl font-bold">Agents</h1>

      {withdrawals.length > 0 && (
        <>
          <h2 className="mt-6 text-lg font-semibold">Pending Withdrawals</h2>
          <div className="mt-3 space-y-2">
            {withdrawals.map((w) => (
              <div key={w.id} className="card flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{w.agent.user.name} · {w.agent.user.phone}</p>
                  <p className="text-xs text-slate">{new Date(w.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">GH₵ {w.amount.toFixed(2)}</span>
                  <button className="btn-secondary !px-3 !py-1.5 !text-xs" onClick={() => markWithdrawalPaid(w.id)}>
                    Mark Paid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="mt-8 text-lg font-semibold">All Agents</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
              <th className="py-2">Name</th><th>Phone</th><th>Wallet</th><th>Earnings</th><th>Discount %</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            {slice.map((a) => (
              <tr key={a.id} className="border-b border-ink/5">
                <td className="py-2">{a.user.name}</td>
                <td>{a.user.phone}</td>
                <td>GH₵ {a.walletBalance.toFixed(2)}</td>
                <td className="text-primary">GH₵ {(a.earningsBalance ?? 0).toFixed(2)}</td>
                <td>
                  <input
                    type="number"
                    defaultValue={a.discountPercent}
                    className="field !w-16"
                    onBlur={(e) => updateAgent(a.id, { discountPercent: Number(e.target.value) })}
                  />
                </td>
                <td>{a.status}</td>
                <td className="space-x-2">
                  {a.status !== "APPROVED" && (
                    <button className="rounded-md border border-ink/15 px-2 py-1 text-xs" onClick={() => updateAgent(a.id, { status: "APPROVED" })}>Approve</button>
                  )}
                  {a.status !== "REJECTED" && a.status === "PENDING" && (
                    <button className="rounded-md border border-ink/15 px-2 py-1 text-xs" onClick={() => updateAgent(a.id, { status: "REJECTED" })}>Reject</button>
                  )}
                  {a.status === "APPROVED" && (
                    <button className="rounded-md border border-ink/15 px-2 py-1 text-xs" onClick={() => updateAgent(a.id, { status: "SUSPENDED" })}>Suspend</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {agents.length === 0 && <p className="mt-3 text-sm text-slate">No agent applications yet.</p>}
        <Pager page={page} totalPages={totalPages} onChange={setPage} count={agents.length} />
      </div>
    </div>
  );
}

function Pager({ page, totalPages, onChange, count }: { page: number; totalPages: number; onChange: (p: number) => void; count: number }) {
  if (count === 0) return null;
  return (
    <div className="mt-3 flex items-center justify-between text-sm">
      <span className="text-slate">{count} agent{count === 1 ? "" : "s"}</span>
      <div className="flex items-center gap-3">
        <span className="text-slate">Page {page} of {totalPages}</span>
        <button onClick={() => onChange(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-40">Prev</button>
        <button onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}