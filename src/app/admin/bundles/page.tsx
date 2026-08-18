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

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  function load() {
    fetch("/api/admin/bundles").then((r) => r.json()).then(setBundles);
  }

  useEffect(load, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/admin/bundles", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setSyncMsg((data && data.error) || `Sync failed (status ${res.status}). It may have timed out - try again.`);
        return;
      }
      setSyncMsg("Catalog synced from supplier.");
      load();
    } catch (err: any) {
      setSyncMsg(err.message || "Sync failed - couldn't reach the server.");
    } finally {
      setSyncing(false);
    }
  }

  async function patchBundle(id: string, body: Record<string, unknown>) {
    await fetch("/api/admin/bundles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...body }),
    });
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Data Bundles</h1>
        <button className="btn-primary" onClick={handleSync} disabled={syncing}>
          {syncing ? "Syncing…" : "Sync catalog from supplier"}
        </button>
      </div>
      {syncMsg && <p className="mt-2 text-sm text-primary">{syncMsg}</p>}

      <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase text-slate">
            <th className="py-2">Network</th>
            <th>Size</th>
            <th>Cost</th>
            <th>Selling price</th>
            <th>Validity (days)</th>
            <th>Margin</th>
            <th>Active</th>
          </tr>
        </thead>
        <tbody>
          {bundles.map((b) => (
            <tr key={b.id} className="border-b border-ink/5">
              <td className="py-2">{b.network.toUpperCase()}</td>
              <td>{b.dataSizeGb}GB</td>
              <td>GH₵ {b.costPrice.toFixed(2)}</td>
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
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {bundles.length === 0 && (
        <p className="mt-6 text-sm text-slate">
          No bundles yet — click "Sync catalog from supplier" to pull the current package list and prices.
        </p>
      )}
    </div>
  );
}