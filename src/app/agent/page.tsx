"use client";

import { useEffect, useState } from "react";

type Profile = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  walletBalance: number;
  discountPercent: number;
};

type Bundle = { id: string; network: string; dataSizeGb: number; sellingPrice: number; costPrice: number };
type Transaction = { id: string; type: string; amount: number; status: string; description: string | null; createdAt: string };
type Sale = { id: string; bundleId: string; beneficiaryNumber: string; resellerCost: number; customerPrice: number; profit: number; status: string; createdAt: string };
type StoreOrder = { id: string; dataSizeGb: number; network: string; beneficiaryNumber: string; amount: number; commission: number; paymentStatus: string; fulfillmentStatus: string; createdAt: string };
type AfaOffer = { id: string; fullName: string; phoneNumber: string; town: string; occupation: string; amount: number; paymentStatus: string; supplierStatus: string | null; createdAt: string };

type ActivePanel = "prices" | "withdraw" | "afa" | "store" | null;

export default function AgentDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<{ todaySalesCount: number; todayRevenue: number; totalProfit: number; totalSalesCount: number } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [afaOffers, setAfaOffers] = useState<AfaOffer[]>([]);
  const [afaPrice, setAfaPrice] = useState(0);
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
          setStoreOrders(d.storeOrders || []);
        }
      })
      .finally(() => setLoading(false));

    fetch("/api/agents/bundles").then((r) => r.json()).then((d) => setBundles(Array.isArray(d) ? d : []));
    fetch("/api/agents/afa")
      .then((r) => r.json())
      .then((d) => {
        setAfaOffers(d.offers || []);
        setAfaPrice(d.price || 0);
      })
      .catch(() => {});
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
        <button onClick={() => setPanel(panel === "prices" ? null : "prices")} className="btn-primary">Price List</button>
        <button onClick={() => setPanel(panel === "afa" ? null : "afa")} className="btn-secondary">Create AFA Offer</button>
        <button onClick={() => setPanel(panel === "withdraw" ? null : "withdraw")} className="btn-secondary">Withdraw</button>
        <button onClick={() => setPanel(panel === "store" ? null : "store")} className="btn-secondary">My Store</button>
      </div>

      {panel === "prices" && <PriceListPanel bundles={bundles} />}
      {panel === "withdraw" && <WithdrawPanel balance={profile!.walletBalance} onDone={() => { setPanel(null); load(); }} />}
      {panel === "afa" && <AfaPanel price={afaPrice} onDone={() => { setPanel(null); load(); }} />}
      {panel === "store" && <StorePanel />}

      {/* AFA Services */}
      <h2 className="mt-10 text-lg font-semibold">AFA Services</h2>
      <div className="card mt-3 border-primary/25 bg-primary/5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate">Current AFA Price</p>
        <p className="mt-1 text-xl font-bold text-primary">GH₵ {afaPrice.toFixed(2)}</p>
        <p className="mt-1 text-xs text-slate">Set by your admin — deducted from your wallet per offer.</p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
              <th className="py-2">Customer</th><th>Phone</th><th>Town</th><th>Occupation</th><th>Amount</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {afaOffers.map((o) => (
              <tr key={o.id} className="border-b border-ink/5">
                <td className="py-2">{o.fullName}</td>
                <td>{o.phoneNumber}</td>
                <td>{o.town}</td>
                <td>{o.occupation}</td>
                <td>GH₵ {o.amount.toFixed(2)}</td>
                <td>{o.supplierStatus || o.paymentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {afaOffers.length === 0 && <p className="mt-3 text-sm text-slate">No AFA offers yet.</p>}
      </div>

      {/* Store sales (orders customers placed through the agent's storefront link) */}
      <h2 className="mt-10 text-lg font-semibold">Store Sales</h2>
      <p className="text-xs text-slate">Orders customers placed through your store link. Commission is added to your wallet once an order is delivered.</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
              <th className="py-2">Date &amp; time</th><th>Bundle</th><th>Recipient</th><th>Paid</th><th>Commission</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {storeOrders.map((o) => {
              const delivered = o.fulfillmentStatus === "DELIVERED";
              const failed = o.fulfillmentStatus === "FAILED";
              const unpaid = o.paymentStatus !== "PAID";
              const statusLabel = unpaid ? "Awaiting payment" : delivered ? "Delivered" : failed ? "Failed" : "Processing";
              const statusClass = delivered ? "text-primary" : failed ? "text-ghRed" : "text-slate";
              return (
                <tr key={o.id} className="border-b border-ink/5">
                  <td className="py-2 whitespace-nowrap">{new Date(o.createdAt).toLocaleString()}</td>
                  <td className="whitespace-nowrap">{o.dataSizeGb}GB {o.network}</td>
                  <td>{o.beneficiaryNumber}</td>
                  <td>GH₵ {o.amount.toFixed(2)}</td>
                  <td className="text-primary">GH₵ {o.commission.toFixed(2)}</td>
                  <td className={statusClass}>{statusLabel}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {storeOrders.length === 0 && <p className="mt-3 text-sm text-slate">No store sales yet. Share your store link to start earning commission.</p>}
      </div>

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

function PriceListPanel({ bundles }: { bundles: Bundle[] }) {
  const NETWORK_LABELS: Record<string, string> = {
    MTN: "MTN", TELECEL: "Telecel",
    AIRTELTIGO_ISHARE: "AirtelTigo (iShare)", AIRTELTIGO_BIGTIME: "AirtelTigo (BigTime)",
  };
  const sorted = [...bundles].sort(
    (a, b) => a.network.localeCompare(b.network) || a.dataSizeGb - b.dataSizeGb
  );

  return (
    <div className="card mt-4">
      <p className="text-sm font-semibold">Your agent price list</p>
      <p className="mt-1 text-xs text-slate">
        As an approved agent, you enjoy a special rate of 2.4% below the standard price on every
        data bundle. The prices below are your discounted agent prices.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
              <th className="py-2">Network</th><th>Bundle</th><th>Validity</th><th className="text-right">Your price</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((b) => (
              <tr key={b.id} className="border-b border-ink/5">
                <td className="py-2 whitespace-nowrap">{NETWORK_LABELS[b.network] || b.network}</td>
                <td className="font-medium">{b.dataSizeGb}GB</td>
                <td className="text-slate">{(b as any).validityDays ?? "—"} days</td>
                <td className="text-right font-semibold text-primary">
                  GH₵ {(Math.round(b.costPrice * 1.024 * 100) / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && <p className="mt-3 text-sm text-slate">No bundles available yet.</p>}
      </div>
    </div>
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

function AfaPanel({ price, onDone }: { price: number; onDone: () => void }) {
  const [form, setForm] = useState({
    fullName: "", phoneNumber: "", idNumber: "", dateOfBirth: "",
    town: "", occupation: "", region: "", cropProduce: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/agents/afa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Could not create offer."); return; }
    onDone();
  }

  return (
    <form onSubmit={submit} className="card mt-4 max-w-lg space-y-3">
      <p className="text-sm font-semibold">Create AFA Offer — GH₵ {price.toFixed(2)}</p>
      <div className="grid grid-cols-2 gap-3">
        <input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Customer full name" className="field col-span-2" required />
        <input value={form.phoneNumber} onChange={(e) => update("phoneNumber", e.target.value.replace(/[^\d]/g, ""))} placeholder="Phone number" maxLength={10} className="field" required />
        <input value={form.idNumber} onChange={(e) => update("idNumber", e.target.value)} placeholder="ID number (Ghana Card)" className="field" required />
        <input value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} type="date" className="field" required />
        <input value={form.town} onChange={(e) => update("town", e.target.value)} placeholder="Town" className="field" required />
        <input value={form.occupation} onChange={(e) => update("occupation", e.target.value)} placeholder="Occupation" className="field" required />
        <input value={form.region} onChange={(e) => update("region", e.target.value)} placeholder="Region" className="field" required />
        <input value={form.cropProduce} onChange={(e) => update("cropProduce", e.target.value)} placeholder="Crop/produce (optional)" className="field" />
      </div>
      {error && <p className="text-sm text-ghRed">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Submitting…" : `Create Offer — GH₵ ${price.toFixed(2)}`}</button>
    </form>
  );
}

function StorePanel() {
  const [slug, setSlug] = useState("");
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents/store")
      .then((r) => r.json())
      .then((d) => {
        if (d.storeSlug) { setSlug(d.storeSlug); setSavedSlug(d.storeSlug); }
      })
      .catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null); setLoading(true);
    const res = await fetch("/api/agents/store", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const d = await res.json();
    setLoading(false);
    if (!res.ok) { setErr(d.error || "Could not save."); return; }
    setSavedSlug(d.storeSlug);
    setMsg("Saved. Share your store link with customers.");
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = savedSlug ? `${origin}/store/${savedSlug}` : null;

  return (
    <form onSubmit={save} className="card mt-4 max-w-md">
      <p className="text-sm font-semibold">My Store</p>
      <p className="mt-1 text-xs text-slate">
        Get a public link customers buy from. You earn a fixed 4.7% commission on every delivered
        order, added straight to your wallet.
      </p>

      <label className="label mt-4">Store name (your link)</label>
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate">/store/</span>
        <input
          className="field"
          placeholder="kwamedata"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())}
        />
      </div>

      <div className="mt-4 rounded-lg bg-mist p-3 text-xs text-ink/70">
        Your commission rate: <span className="font-semibold text-ink">4.7%</span> on every sale through your store.
      </div>

      {err && <p className="mt-3 text-sm text-ghRed">{err}</p>}
      {msg && <p className="mt-3 text-sm text-primary">{msg}</p>}

      <button className="btn-primary mt-4 w-full" disabled={loading}>
        {loading ? "Saving…" : "Save store settings"}
      </button>

      {link && (
        <div className="mt-4 rounded-lg bg-mist p-3">
          <p className="text-xs text-slate">Your store link:</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 break-all text-xs text-ink">{link}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(link)}
              className="btn-secondary !py-1 !px-3 !text-xs"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
