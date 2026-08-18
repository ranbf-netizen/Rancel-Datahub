"use client";

import { useEffect, useState } from "react";

export default function AdminOverview() {
  const [wallet, setWallet] = useState<{ balance?: number; low?: boolean; error?: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/wallet").then((r) => r.json()).then(setWallet);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>

      <div className="mt-6 card max-w-md">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          mydatagigs.com wallet balance
        </h2>
        {!wallet && <p className="mt-2 text-sm text-ink/50">Checking…</p>}
        {wallet?.error && (
          <p className="mt-2 text-sm text-clay">
            Couldn't check balance — {wallet.error}
          </p>
        )}
        {wallet?.balance !== undefined && (
          <>
            <p className="mt-2 text-3xl font-bold">GH₵ {wallet.balance.toFixed(2)}</p>
            {wallet.low && (
              <p className="mt-2 text-sm font-medium text-red-600">
                ⚠ Balance is low — top up on mydatagigs.com or customer orders will start failing.
              </p>
            )}
          </>
        )}
        <p className="mt-3 text-xs text-ink/50">
          This is your balance on the supplier's platform, separate from what customers pay you.
          Fund it whenever it runs low.
        </p>
      </div>

      <p className="mt-8 text-sm text-ink/60">
        Use the menu on the left to manage bundle pricing, upload PIN batches, and review orders.
      </p>
    </div>
  );
}
