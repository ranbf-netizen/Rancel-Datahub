"use client";

import { useEffect, useState } from "react";

type Bundle = {
  id: string;
  network: string;
  label: string;
  dataSizeGb: number;
  costPrice: number;
  sellingPrice: number;
  validityDays: number;
  active: boolean;
};

const NETWORKS = ["MTN", "TELECEL", "AIRTELTIGO_ISHARE", "AIRTELTIGO_BIGTIME"];

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [form, setForm] = useState({ network: "MTN", dataSizeGb: "", costPrice: "", sellingPrice: "", validityDays: "30" });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  function load() {
    fetch("/api/admin/bundles").then((r) => r.json()).then(setBundles);
  }

  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setAdding(true);
    const res = await fetch("/api/admin/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setAdding(false);
    if (!res.ok) {
      setError(data.error || "Could not add bundle.");
      return;
    }
    setForm({ network: form.network, dataSizeGb: "", costPrice: "", sellingPrice: "", validityDays: "30" });
    load();
  }

  async function patchBundle(id: string, body: Record<string, unknown>) {
    await fetch("/api/admin/bundles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    load();
  }

  async function removeBundle(id: string) {
    if (!confirm("Delete this bundle permanently?")) return;
    await fetch("/api/admin/bundles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Data Bundles</h1>
      {/*<p className="mt-1 text-sm text-slate">
        Cledanet doesn't provide a live catalog, so bundles are added manually here based on
        their current sizes and rates.
      </p>*/}

      <form onSubmit={handleAdd} className="card mt-6 max-w-xl">
        <p className="text-sm font-semibold">Add a bundle</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <select
            value={form.network}
            onChange={(e) => setForm({ ...form, network: e.target.value })}
            className="field col-span-2 sm:col-span-1"
          >
            {NETWORKS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <input
            placeholder="Size (GB)"
            type="number"
            value={form.dataSizeGb}
            onChange={(e) => setForm({ ...form, dataSizeGb: e.target.value })}
            className="field"
            required
          />
          <input
            placeholder="Cost (GH₵)"
            type="number"
            step="0.01"
            value={form.costPrice}
            onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
            className="field"
            required
          />
          <input
            placeholder="Selling price (GH₵)"
            type="number"
            step="0.01"
            value={form.sellingPrice}
            onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
            className="field"
            required
          />
          <input
            placeholder="Validity (days)"
            type="number"
            value={form.validityDays}
            onChange={(e) => setForm({ ...form, validityDays: e.target.value })}
            className="field"
          />
        </div>
        {error && <p className="mt-2 text-sm text-ghRed">{error}</p>}
        <button className="btn-primary mt-3" disabled={adding}>
          {adding ? "Adding…" : "Add Bundle"}
        </button>
      </form>

      <div className="mt-8 overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
            <th className="py-2">Network</th>
            <th>Size</th>
            <th>Cost</th>
            <th>Selling price</th>
            <th>Validity (days)</th>
            <th>Margin</th>
            <th>Active</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bundles.map((b) => (
            <tr key={b.id} className="border-b border-ink/5">
              <td className="py-2">{b.network.replace(/_/g, " ")}</td>
              <td>{b.dataSizeGb}GB</td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={b.costPrice}
                  className="field !w-20"
                  onBlur={(e) => patchBundle(b.id, { costPrice: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  defaultValue={b.sellingPrice}
                  className="field !w-24"
                  onBlur={(e) => patchBundle(b.id, { sellingPrice: Number(e.target.value) })}
                />
              </td>
              <td>
                <input
                  type="number"
                  defaultValue={b.validityDays}
                  className="field !w-20"
                  onBlur={(e) => patchBundle(b.id, { validityDays: Number(e.target.value) })}
                />
              </td>
              <td className="text-primary">GH₵ {(b.sellingPrice - b.costPrice).toFixed(2)}</td>
              <td>
                <input
                  type="checkbox"
                  checked={b.active}
                  onChange={() => patchBundle(b.id, { active: !b.active })}
                />
              </td>
              <td>
                <button
                  className="rounded-md border border-ghRed/30 px-2 py-1 text-xs text-ghRed hover:bg-ghRed/5"
                  onClick={() => removeBundle(b.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {bundles.length === 0 && (
        <p className="mt-6 text-sm text-slate">No bundles yet — add your first one above.</p>
      )}
    </div>
  );
}
