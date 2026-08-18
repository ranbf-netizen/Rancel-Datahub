"use client";

import { useEffect, useState } from "react";

type Batch = {
  id: string;
  examType: string;
  year: number;
  sellingPrice: number;
  available: number;
};

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

export default function ResultsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selected, setSelected] = useState<Batch | null>(null);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/pins").then((r) => r.json()).then(setBatches);
  }, []);

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setStatus(null);
    setLoading(true);

    const res = await fetch("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: selected.id, guestPhone: phone }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
      return;
    }
    setStatus(data.error || "Order created — payment setup is pending (Paystack keys not added yet).");
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Results Checker</p>
      <h1 className="mt-1 text-3xl font-bold">WAEC & BECE PINs</h1>
      <p className="mt-2 text-slate">
        Buy a results checker PIN — revealed the moment your payment is confirmed. No account needed.
      </p>

      <div className="mt-8 space-y-3">
        {batches.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelected(b)}
            className={`card flex w-full flex-col items-start justify-between gap-3 text-left transition sm:flex-row sm:items-center ${
              selected?.id === b.id ? "ring-2 ring-primary" : ""
            }`}
          >
            <div>
              <p className="font-semibold">{b.examType} {b.year}</p>
              <p className="text-sm text-slate">
                GH₵ {b.sellingPrice.toFixed(2)} · {b.available} left in stock
              </p>
            </div>
            <span className="btn-primary !py-2 !text-xs">Select</span>
          </button>
        ))}
        {batches.length === 0 && (
          <p className="text-sm text-slate">No PINs in stock right now — check back soon.</p>
        )}
      </div>

      {selected && (
        <form onSubmit={handleBuy} className="card mt-8 max-w-md">
          <h2 className="text-lg font-semibold">
            {selected.examType} {selected.year} — GH₵ {selected.sellingPrice.toFixed(2)}
          </h2>
          <label className="label mt-4">Your phone number</label>
          <input
            className="field"
            placeholder="024 XXX XXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
            maxLength={10}
            required
          />
          <p className="mt-1 text-xs text-slate">Used to track this order later at /track — no account required.</p>
          {status && <p className="mt-3 text-sm text-ghRed">{status}</p>}
          <button className="btn-primary mt-4 w-full" disabled={loading || !isValidGhanaNumber(phone)}>
            {loading ? "Starting checkout…" : "Continue to Payment"}
          </button>
        </form>
      )}
    </div>
  );
}
