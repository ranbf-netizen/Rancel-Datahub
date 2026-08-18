"use client";

import { useEffect, useState } from "react";

type Bundle = {
  id: string;
  network: string;
  label: string;
  dataSizeGb: number;
  sellingPrice: number;
};

const NETWORK_LABELS: Record<string, string> = {
  mtn: "MTN",
  telecel: "Telecel",
  at_bigdata: "AirtelTigo (BigData)",
  at_ishare: "AirtelTigo (iShare)",
};

export default function DataPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [network, setNetwork] = useState("mtn");
  const [selected, setSelected] = useState<Bundle | null>(null);
  const [beneficiary, setBeneficiary] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/bundles").then((r) => r.json()).then(setBundles);
  }, []);

  const filtered = bundles.filter((b) => b.network === network);

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setStatus(null);
    setLoading(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundleId: selected.id, beneficiaryNumber: beneficiary }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.status === 401) {
      setStatus("Please log in first, then try again.");
      return;
    }
    if (data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
      return;
    }
    setStatus(data.error || "Order created — payment setup is pending (Paystack keys not added yet).");
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold">Buy Data Bundles</h1>
      <p className="mt-2 text-ink/70">Pick a network, choose a bundle, and pay per order.</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {Object.entries(NETWORK_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setNetwork(key); setSelected(null); }}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              network === key ? "bg-moss text-paper" : "bg-sand text-ink/70"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelected(b)}
            className={`card text-left ${selected?.id === b.id ? "ring-2 ring-moss" : ""}`}
          >
            <p className="text-lg font-semibold">{b.dataSizeGb}GB</p>
            <p className="text-sm text-ink/60">GH₵ {b.sellingPrice.toFixed(2)}</p>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full text-sm text-ink/50">
            No bundles yet for this network — admin needs to sync the catalog first.
          </p>
        )}
      </div>

      {selected && (
        <form onSubmit={handleBuy} className="card mt-8 max-w-md">
          <h2 className="text-lg font-semibold">
            {selected.dataSizeGb}GB · {NETWORK_LABELS[selected.network]} — GH₵ {selected.sellingPrice.toFixed(2)}
          </h2>
          <label className="label mt-4">Recipient number</label>
          <input
            className="field"
            placeholder="0241234567"
            value={beneficiary}
            onChange={(e) => setBeneficiary(e.target.value)}
            required
          />
          {status && <p className="mt-3 text-sm text-clay">{status}</p>}
          <button className="btn-primary mt-4 w-full" disabled={loading}>
            {loading ? "Starting checkout…" : "Pay & Buy"}
          </button>
        </form>
      )}
    </div>
  );
}
