"use client";

import { useEffect, useState } from "react";

type StoreBundle = {
  id: string;
  network: string;
  dataSizeGb: number;
  validityDays: number;
  price: number;
};

const NETWORK_LABELS: Record<string, string> = {
  MTN: "MTN",
  TELECEL: "Telecel",
  AIRTELTIGO_ISHARE: "AirtelTigo (iShare)",
  AIRTELTIGO_BIGTIME: "AirtelTigo (BigTime)",
};

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

export default function StorePage({ params }: { params: { slug: string } }) {
  const [store, setStore] = useState<{ storeName: string; bundles: StoreBundle[] } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<StoreBundle | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/store/${params.slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setStore)
      .catch(() => setNotFound(true));
  }, [params.slug]);

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/store/${params.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundleId: selected.id, beneficiaryNumber: phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
      return;
    }
    setError(data.error || "Payment could not be started.");
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="text-2xl font-bold">Store not found</h1>
        <p className="mt-2 text-slate">This storefront link doesn&rsquo;t exist or is no longer active.</p>
      </div>
    );
  }

  if (!store) {
    return <div className="mx-auto max-w-md px-5 py-20 text-center text-slate">Loading store…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Data Store</p>
      <h1 className="mt-1 text-3xl font-bold">{store.storeName}</h1>
      <p className="mt-2 text-slate">
        Buy a data bundle below. Pay securely and your data is delivered automatically — no account needed.
      </p>

      <div className="mt-8 space-y-3">
        {store.bundles.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelected(b)}
            className={`card flex w-full items-center justify-between gap-3 text-left transition ${
              selected?.id === b.id ? "ring-2 ring-primary" : ""
            }`}
          >
            <div>
              <p className="font-semibold">{b.dataSizeGb}GB · {NETWORK_LABELS[b.network] || b.network}</p>
              <p className="text-sm text-slate">Valid {b.validityDays} days</p>
            </div>
            <span className="font-semibold">GH₵ {b.price.toFixed(2)}</span>
          </button>
        ))}
        {store.bundles.length === 0 && (
          <p className="text-sm text-slate">No bundles available right now — check back soon.</p>
        )}
      </div>

      {selected && (
        <form onSubmit={handleBuy} className="card mt-8 max-w-md">
          <h2 className="text-lg font-semibold">
            {selected.dataSizeGb}GB {NETWORK_LABELS[selected.network] || selected.network} — GH₵ {selected.price.toFixed(2)}
          </h2>
          <label className="label mt-4">Recipient number</label>
          <input
            className="field"
            placeholder="024 XXX XXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
            maxLength={10}
            required
          />
          <p className="mt-1 text-xs text-slate">The number that will receive the data.</p>
          {error && <p className="mt-3 text-sm text-ghRed">{error}</p>}
          <button className="btn-primary mt-4 w-full" disabled={loading || !isValidGhanaNumber(phone)}>
            {loading ? "Starting checkout…" : `Pay GH₵ ${selected.price.toFixed(2)}`}
          </button>
        </form>
      )}
    </div>
  );
}
