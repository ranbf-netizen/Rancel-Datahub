"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Mail, Pause, Play, Users } from "lucide-react";

type Product = { id: string; title: string };
type Account = {
  id: string;
  label: string;
  loginEmail: string;
  inboundAddress: string;
  active: boolean;
  revealSeconds: number;
  turnSeconds: number;
  product: { id: string; title: string } | null;
  _count: { sessions: number };
};

const BLANK = {
  productId: "",
  label: "",
  loginEmail: "",
  inboundAddress: "",
  revealSeconds: 60,
  turnSeconds: 180,
};

export default function CodeAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({ ...BLANK });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function load() {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        fetch("/api/admin/code-accounts", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/digital-products", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setAccounts(Array.isArray(a) ? a : []);
      setProducts(
        (Array.isArray(p) ? p : [])
          .filter((x: any) => x.deliveryType === "INBOUND_CODE")
          .map((x: any) => ({ id: x.id, title: x.title }))
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setError("");
    if (!form.productId || !form.label || !form.loginEmail || !form.inboundAddress) {
      setError("Please fill in product, label, login email and inbound address.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/code-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Could not create the account.");
        return;
      }
      setForm({ ...BLANK });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(acc: Account) {
    await fetch("/api/admin/code-accounts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: acc.id, active: !acc.active }),
    });
    load();
  }

  async function remove(acc: Account) {
    if (!confirm(`Delete "${acc.label}"? This can't be undone.`)) return;

    let res = await fetch("/api/admin/code-accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: acc.id }),
    });
    let data = await res.json();

    // Blocked because buyers are in the queue: offer to force-clear.
    if (res.status === 409 && data?.canForce) {
      const ok = confirm(
        `${data.liveCount} buyer(s) are still in this account's queue.\n\n` +
          `If these are leftover or test sessions, you can force delete — this clears the queue and removes the account.\n\n` +
          `Only do this if no real customer is currently waiting. Force delete now?`
      );
      if (!ok) return;

      res = await fetch("/api/admin/code-accounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: acc.id, force: true }),
      });
      data = await res.json();
    }

    if (!res.ok) alert(data?.error || "Could not delete.");
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Code Accounts</h1>
      <p className="mt-1 text-sm text-slate">
        Each account is one real login you resell (e.g. &ldquo;Netflix #1&rdquo;). Sign-in codes
        arrive by email at its inbound address and are handed to buyers one at a time.
      </p>

      {/* Create form */}
      <div className="card mt-6">
        <h2 className="text-sm font-semibold text-ink">Add an account</h2>

        {products.length === 0 ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            First create a Shop product with delivery type <strong>&ldquo;Live sign-in code&rdquo;</strong>,
            then come back here to attach accounts to it.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Product</label>
              <select className="field" value={form.productId} onChange={(e) => set("productId", e.target.value)}>
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Internal label</label>
              <input className="field" placeholder="Netflix #1" value={form.label} onChange={(e) => set("label", e.target.value)} />
            </div>

            <div>
              <label className="label">Login email (buyer signs in with this)</label>
              <input className="field" placeholder="rancelnetflix@gmail.com" value={form.loginEmail} onChange={(e) => set("loginEmail", e.target.value)} />
            </div>

            <div>
              <label className="label">Inbound address (where codes arrive)</label>
              <input className="field" placeholder="netflix1@ranceldatahub.shop" value={form.inboundAddress} onChange={(e) => set("inboundAddress", e.target.value)} />
            </div>

            <div>
              <label className="label">Code visible (seconds)</label>
              <input className="field" type="number" min={5} value={form.revealSeconds} onChange={(e) => set("revealSeconds", Number(e.target.value))} />
            </div>

            <div>
              <label className="label">Turn length (seconds)</label>
              <input className="field" type="number" min={30} value={form.turnSeconds} onChange={(e) => set("turnSeconds", Number(e.target.value))} />
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-medium text-ghRed">{error}</p>}

        {products.length > 0 && (
          <button onClick={create} disabled={saving} className="btn-primary mt-4 gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? "Saving…" : "Add account"}
          </button>
        )}
      </div>

      {/* List */}
      <div className="mt-8">
        {loading ? (
          <p className="inline-flex items-center gap-2 text-slate"><Loader2 size={16} className="animate-spin" /> Loading…</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-slate">No accounts yet.</p>
        ) : (
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="card flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink">{acc.label}</p>
                    {acc.active ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Active</span>
                    ) : (
                      <span className="rounded-full bg-slate/10 px-2 py-0.5 text-[11px] font-semibold text-slate">Paused</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate">{acc.product?.title || "— no product —"}</p>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate">
                    <span className="inline-flex items-center gap-1"><Mail size={12} /> {acc.loginEmail}</span>
                    <span className="inline-flex items-center gap-1">↳ {acc.inboundAddress}</span>
                    <span className="inline-flex items-center gap-1"><Users size={12} /> {acc._count.sessions} in queue</span>
                    <span>code {acc.revealSeconds}s · turn {acc.turnSeconds}s</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleActive(acc)} className="btn-secondary gap-2 px-4 py-2">
                    {acc.active ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
                  </button>
                  <button onClick={() => remove(acc)} className="rounded-xl border border-ghRed/20 bg-ghRed/5 p-2.5 text-ghRed hover:bg-ghRed/10" aria-label="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
