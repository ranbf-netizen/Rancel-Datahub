"use client";

import { useEffect, useState } from "react";

type Profile = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  walletBalance: number;
  discountPercent: number;
};

type Bundle = { id: string; network: string; dataSizeGb: number; sellingPrice: number };
type Transaction = { id: string; type: string; amount: number; status: string; description: string | null; createdAt: string };
type Sale = { id: string; bundleId: string; beneficiaryNumber: string; resellerCost: number; customerPrice: number; profit: number; status: string; createdAt: string };

type ActivePanel = "sell" | "topup" | "withdraw" | null;

export default function AgentDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<{ todaySalesCount: number; todayRevenue: number; totalProfit: number; totalSalesCount: number } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<ActivePanel>(null);
  const [notApplied, setNotApplied] = useState(false);

  function load() {
    fetch("/api/agents/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.profile) {
          setNotApplied(true);
        } else {
          setProfile(d.profile);
          setStats(d.stats);
          setTransactions(d.recentTransactions || []);
          setSales(d.recentSales || []);
        }
      })
      .finally(() => setLoading(false));

    fetch("/api/bundles").then((r) => r.json()).then((d) => setBundles(Array.isArray(d) ? d : []));
  }

  useEffect(load, []);

  if (loading) return <div className="mx-auto max-w-5xl px-5 py-16 text-sm text-slate">Loading…</div>;

  if (notApplied) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="text-2xl font-bold">You haven't applied yet</h1>
        <p className="mt-3 text-slate">Head to the Agents page to apply for a RanCel Agent account.</p>
        <a href="/agents" className="btn-primary mt-6 inline-flex">Become an Agent</a>
      </div>
    );
  }

  if (profile && profile.status !== "APPROVED") {
    const messages: Record<string, string> = {
      PENDING: "Your agent application is under review. We'll notify you once it's approved.",
      REJECTED: "Your agent application wasn't approved. Contact support via WhatsApp for details.",
      SUSPENDED: "Your agent account is currently suspended. Contact support via WhatsApp.",
    };
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="text-2xl font-bold">Agent status: {profile.status}</h1>
        <p className="mt-3 text-slate">{messages[profile.status]}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="text-2xl font-bold">Agent Dashboard</h1>

      {/* Wallet + stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Wallet Balance" value={`GH₵ ${profile!.walletBalance.toFixed(2)}`} highlight />
        <StatCard label="Today's Sales" value={String(stats?.todaySalesCount ?? 0)} />
        <StatCard label="Today's Revenue" value={`GH₵ ${(stats?.todayRevenue ?? 0).toFixed(2)}`} />
        <StatCard label="Total Profit" value={`GH₵ ${(stats?.totalProfit ?? 0).toFixed(2)}`} />
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={() => setPanel(panel === "sell" ? null : "sell")} className="btn-primary">Sell Data</button>
        <button onClick={() => setPanel(panel === "topup" ? null : "topup")} className="btn-secondary">Add Money</button>
        <button onClick={() => setPanel(panel === "withdraw" ? null : "withdraw")} className="btn-secondary">Withdraw</button>
      </div>

      {panel === "sell" && <SellPanel bundles={bundles} discountPercent={profile!.discountPercent} onDone={() => { setPanel(null); load(); }} />}
      {panel === "topup" && <TopupPanel onDone={() => setPanel(null)} />}
      {panel === "withdraw" && <WithdrawPanel balance={profile!.walletBalance} onDone={() => { setPanel(null); load(); }} />}

      {/* Recent sales */}
      <h2 className="mt-10 text-lg font-semibold">Recent Sales</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
              <th className="py-2">Recipient</th><th>Cost</th><th>Charged</th><th>Profit</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-b border-ink/5">
                <td className="py-2">{s.beneficiaryNumber}</td>
                <td>GH₵ {s.resellerCost.toFixed(2)}</td>
                <td>GH₵ {s.customerPrice.toFixed(2)}</td>
                <td className="text-primary">GH₵ {s.profit.toFixed(2)}</td>
                <td>{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && <p className="mt-3 text-sm text-slate">No sales yet.</p>}
      </div>

      {/* Recent transactions */}
      <h2 className="mt-10 text-lg font-semibold">Recent Transactions</h2>
      <div className="mt-3 space-y-2">
        {transactions.map((t) => (
          <div key={t.id} className="card flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">{t.description || t.type}</p>
              <p className="text-xs text-slate">{new Date(t.createdAt).toLocaleString()} · {t.status}</p>
            </div>
            <span className={t.amount >= 0 ? "text-primary font-semibold" : "text-ghRed font-semibold"}>
              {t.amount >= 0 ? "+" : ""}GH₵ {t.amount.toFixed(2)}
            </span>
          </div>
        ))}
        {transactions.length === 0 && <p className="text-sm text-slate">No transactions yet.</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`card ${highlight ? "border-primary/30 bg-primary/5" : ""}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate">{label}</p>
      <p className={`mt-1 text-xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function SellPanel({ bundles, discountPercent, onDone }: { bundles: Bundle[]; discountPercent: number; onDone: () => void }) {
  const [bundleId, setBundleId] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [customerPrice, setCustomerPrice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = bundles.find((b) => b.id === bundleId);
  const resellerCost = selected ? Math.round(selected.sellingPrice * (1 - discountPercent / 100) * 100) / 100 : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/agents/sell", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundleId, beneficiaryNumber: beneficiary, customerPrice }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Sale failed."); return; }
    onDone();
  }

  return (
    <form onSubmit={submit} className="card mt-4 max-w-md space-y-3">
      <p className="text-sm font-semibold">Sell Data</p>
      <select value={bundleId} onChange={(e) => setBundleId(e.target.value)} className="field" required>
        <option value="">Select bundle</option>
        {bundles.map((b) => (
          <option key={b.id} value={b.id}>{b.dataSizeGb}GB · {b.network.toUpperCase()}</option>
        ))}
      </select>
      {selected && <p className="text-xs text-slate">Your reseller cost: GH₵ {resellerCost.toFixed(2)} ({discountPercent}% off)</p>}
      <input value={beneficiary} onChange={(e) => setBeneficiary(e.target.value.replace(/[^\d]/g, ""))} placeholder="Recipient number" maxLength={10} className="field" required />
      <input value={customerPrice} onChange={(e) => setCustomerPrice(e.target.value)} placeholder="Amount you charged your customer (GH₵)" type="number" step="0.01" className="field" required />
      {error && <p className="text-sm text-ghRed">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Processing…" : "Confirm Sale"}</button>
    </form>
  );
}

function TopupPanel({ onDone }: { onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/agents/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.authorizationUrl) { window.location.href = data.authorizationUrl; return; }
    setError(data.error || "Could not start payment.");
  }

  return (
    <form onSubmit={submit} className="card mt-4 max-w-md space-y-3">
      <p className="text-sm font-semibold">Add Money</p>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (GH₵)" type="number" step="0.01" className="field" required />
      {error && <p className="text-sm text-ghRed">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Starting…" : "Continue to Payment"}</button>
    </form>
  );
}

function WithdrawPanel({ balance, onDone }: { balance: number; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/agents/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Withdrawal failed."); return; }
    onDone();
  }

  return (
    <form onSubmit={submit} className="card mt-4 max-w-md space-y-3">
      <p className="text-sm font-semibold">Withdraw</p>
      <p className="text-xs text-slate">Available: GH₵ {balance.toFixed(2)}</p>
      <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount (GH₵)" type="number" step="0.01" className="field" required />
      <p className="text-xs text-slate">We'll settle this to you manually — usually within 24 hours.</p>
      {error && <p className="text-sm text-ghRed">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Requesting…" : "Request Withdrawal"}</button>
    </form>
  );
}
