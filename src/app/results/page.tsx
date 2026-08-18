"use client";

import { useEffect, useState } from "react";

type Batch = {
  id: string;
  examType: string;
  year: number;
  sellingPrice: number;
  available: number;
};

export default function ResultsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pins").then((r) => r.json()).then(setBatches);
  }, []);

  async function handleBuy(batch: Batch) {
    setStatus(null);
    setLoadingId(batch.id);

    const res = await fetch("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: batch.id }),
    });
    const data = await res.json();
    setLoadingId(null);

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
      <h1 className="text-3xl font-bold">Results Checker PINs</h1>
      <p className="mt-2 text-ink/70">
        Buy a WAEC or BECE results checker PIN. Your PIN is revealed immediately after payment.
      </p>

      <div className="mt-8 space-y-4">
        {batches.map((b) => (
          <div key={b.id} className="card flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold">{b.examType} {b.year}</p>
              <p className="text-sm text-ink/60">
                GH₵ {b.sellingPrice.toFixed(2)} · {b.available} left in stock
              </p>
            </div>
            <button className="btn-primary" onClick={() => handleBuy(b)} disabled={loadingId === b.id}>
              {loadingId === b.id ? "Starting checkout…" : "Buy PIN"}
            </button>
          </div>
        ))}
        {batches.length === 0 && (
          <p className="text-sm text-ink/50">No PINs in stock right now — check back soon.</p>
        )}
      </div>

      {status && <p className="mt-4 text-sm text-clay">{status}</p>}
    </div>
  );
}
