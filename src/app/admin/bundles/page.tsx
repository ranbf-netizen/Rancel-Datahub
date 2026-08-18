"use client";

import { useEffect, useState } from "react";

type Bundle = {
  id: string;
  network: string;
  label: string;
  dataSizeGb: number;
  costPrice: number;
  sellingPrice: number;
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
    const res = await fetch("/api/admin/bundles", { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (!res.ok) {
      setSyncMsg(data.error || "Sync failed.");
      return;
    }
    setSyncMsg("Catalog synced from mydatagigs.com.");
    load();
  }

  async function updatePrice(id: string, sellingPrice: number) {
    await fetch("/api/admin/bundles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, sellingPrice }),
    });
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await fetch("/api/admin/bundles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
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
      {syncMsg && <p className="mt-2 text-sm text-moss">{syncMsg}</p>}

      <div className="mt-6 overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase text-ink/50">
            <th className="py-2">Network</th>
            <th>Size</th>
            <th>Cost</th>
            <th>Selling price</th>
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
                  onBlur={(e) => updatePrice(b.id, Number(e.target.value))}
                />
              </td>
              <td className="text-moss">GH₵ {(b.sellingPrice - b.costPrice).toFixed(2)}</td>
              <td>
                <input type="checkbox" checked={b.active} onChange={() => toggleActive(b.id, b.active)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {bundles.length === 0 && (
        <p className="mt-6 text-sm text-ink/50">
          No bundles yet — click "Sync catalog from supplier" to pull the current package list and prices.
        </p>
      )}
    </div>
  );
}
