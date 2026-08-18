"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import UnsupportedSimNotice from "../components/UnsupportedSimNotice";
import VerifyNumberWidget from "../components/VerifyNumberWidget";

type Bundle = {
  id: string;
  network: string;
  label: string;
  dataSizeGb: number;
  sellingPrice: number;
  validityDays: number;
};

const NETWORK_LABELS: Record<string, string> = {
  mtn: "MTN",
  telecel: "Telecel",
  airteltigo: "AirtelTigo",
};

const NETWORK_DOT: Record<string, string> = {
  mtn: "bg-mtn",
  telecel: "bg-telecel",
  airteltigo: "bg-airteltigo",
};

// Active tab + Buy button per network, using each network's real brand color.
// MTN yellow needs dark text for contrast; Telecel red and AirtelTigo blue use white text.
const NETWORK_ACTIVE_CHIP: Record<string, string> = {
  mtn: "!border-transparent !bg-mtn !text-ink",
  telecel: "!border-transparent !bg-telecel !text-white",
  airteltigo: "!border-transparent !bg-airteltigo !text-white",
};

const NETWORK_BUY_BUTTON: Record<string, string> = {
  mtn: "!bg-mtn !text-ink hover:!bg-mtn/90",
  telecel: "!bg-telecel !text-white hover:!bg-telecel/90",
  airteltigo: "!bg-airteltigo !text-white hover:!bg-airteltigo/90",
};

type SortKey = "price-asc" | "price-desc" | "size-asc" | "size-desc";

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

export default function DataPage() {
  const searchParams = useSearchParams();

  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [network, setNetwork] = useState(searchParams.get("network") || "mtn");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("size-asc");
  const [selected, setSelected] = useState<Bundle | null>(null);
  const [beneficiary, setBeneficiary] = useState(searchParams.get("phone") || "");
  const [status, setStatus] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [numberCheck, setNumberCheck] = useState<{ status: string; hoursRemaining?: number } | null>(null);

  useEffect(() => {
    fetch("/api/bundles")
      .then((r) => r.json())
      .then((d) => setBundles(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  // Pre-select the bundle handed off from the homepage Quick Buy widget, once loaded.
  useEffect(() => {
    const preselectId = searchParams.get("bundle");
    if (!preselectId || bundles.length === 0) return;
    const match = bundles.find((b) => b.id === preselectId);
    if (match) setSelected(match);
  }, [bundles, searchParams]);

  // Warn (not block) if the recipient number isn't verified yet - only matters for
  // bundles bigger than 1GB, since a 1GB purchase IS the activation step itself.
  useEffect(() => {
    if (!selected || selected.dataSizeGb <= 1 || !isValidGhanaNumber(beneficiary)) {
      setNumberCheck(null);
      return;
    }
    const timeout = setTimeout(() => {
      fetch(`/api/verify-number?phone=${encodeURIComponent(beneficiary)}`)
        .then((r) => r.json())
        .then((d) => setNumberCheck(d.status ? d : null))
        .catch(() => setNumberCheck(null));
    }, 500);
    return () => clearTimeout(timeout);
  }, [beneficiary, selected]);

  const networksPresent = Array.from(new Set(bundles.map((b) => b.network)));

  const filtered = useMemo(() => {
    let list = bundles.filter((b) => b.network === network);
    if (search.trim()) {
      list = list.filter((b) => b.dataSizeGb.toString().includes(search.trim()));
    }
    switch (sort) {
      case "price-asc": list = [...list].sort((a, b) => a.sellingPrice - b.sellingPrice); break;
      case "price-desc": list = [...list].sort((a, b) => b.sellingPrice - a.sellingPrice); break;
      case "size-desc": list = [...list].sort((a, b) => b.dataSizeGb - a.dataSizeGb); break;
      default: list = [...list].sort((a, b) => a.dataSizeGb - b.dataSizeGb);
    }
    return list;
  }, [bundles, network, search, sort]);

  // Badge heuristics: "Best Value" = lowest price-per-GB in this network;
  // "Popular" = the bundle size closest to the network's average size.
  const { bestValueId, popularId } = useMemo(() => {
    const networkBundles = bundles.filter((b) => b.network === network);
    if (networkBundles.length === 0) return { bestValueId: null as string | null, popularId: null as string | null };
    const bestValue = networkBundles.reduce((best, b) =>
      b.sellingPrice / b.dataSizeGb < best.sellingPrice / best.dataSizeGb ? b : best
    );
    const avgSize = networkBundles.reduce((sum, b) => sum + b.dataSizeGb, 0) / networkBundles.length;
    const popular = networkBundles.reduce((closest, b) =>
      Math.abs(b.dataSizeGb - avgSize) < Math.abs(closest.dataSizeGb - avgSize) ? b : closest
    );
    return { bestValueId: bestValue.id, popularId: popular.id };
  }, [bundles, network]);

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (!isValidGhanaNumber(beneficiary)) {
      setStatus("Enter a valid 10-digit Ghana number, e.g. 0241234567.");
      return;
    }
    setStatus(null);
    setBuying(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundleId: selected.id, beneficiaryNumber: beneficiary }),
    });
    const data = await res.json();
    setBuying(false);

    if (data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
      return;
    }
    setStatus(data.error || "Order created — payment setup is pending (Paystack keys not added yet).");
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Buy Data</p>
      <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Pick a network, pick a bundle, done.</h1>
      <p className="mt-2 max-w-xl text-slate">
        Real prices, no hidden fees, delivered straight to the number you enter — pay per order,
        no wallet needed.
      </p>

      <div className="mt-6 max-w-md">
        <VerifyNumberWidget />
      </div>

      {/* Network tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        {Object.entries(NETWORK_LABELS)
          .filter(([key]) => networksPresent.length === 0 || networksPresent.includes(key))
          .map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setNetwork(key); setSelected(null); }}
              className={`chip flex items-center gap-2 ${network === key ? NETWORK_ACTIVE_CHIP[key] : ""}`}
            >
              <span className={`h-2 w-2 rounded-full ${network === key ? "bg-current" : NETWORK_DOT[key]}`} />
              {label}
            </button>
          ))}
      </div>

      {/* Search + sort */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by size, e.g. 5"
          className="field max-w-[220px]"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="field max-w-[200px]">
          <option value="size-asc">Sort: Size (low to high)</option>
          <option value="size-desc">Sort: Size (high to low)</option>
          <option value="price-asc">Sort: Price (low to high)</option>
          <option value="price-desc">Sort: Price (high to low)</option>
        </select>
      </div>

      {/* Bundle cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && <p className="text-sm text-slate">Loading bundles…</p>}
        {!loading && filtered.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-ink/15 p-6 text-sm text-slate">
            No bundles available for this network right now — check back soon.
          </p>
        )}
        {filtered.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelected(b)}
            className={`card relative text-left transition hover:-translate-y-0.5 hover:shadow-md ${
              selected?.id === b.id ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="flex items-start justify-between">
              <p className="text-2xl font-bold">{b.dataSizeGb}GB</p>
              {b.id === bestValueId && <span className="badge-value">Best Value</span>}
              {b.id === popularId && b.id !== bestValueId && <span className="badge-popular">Popular</span>}
            </div>
            <p className="mt-1 text-lg font-semibold text-primary">GH₵ {b.sellingPrice.toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate">{b.validityDays} Days validity</p>
            <span className={`btn-primary mt-4 w-full !py-2 !text-xs ${NETWORK_BUY_BUTTON[b.network] || ""}`}>Buy Now</span>
          </button>
        ))}
      </div>

      {/* Checkout modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-5"
          onClick={() => setSelected(null)}
        >
          <form
            onSubmit={handleBuy}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {selected.dataSizeGb}GB · {NETWORK_LABELS[selected.network]} — GH₵ {selected.sellingPrice.toFixed(2)}
                </h2>
                <p className="mt-1 text-xs text-slate">Valid for {selected.validityDays} days · Fast delivery</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="shrink-0 text-slate hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>
            <label className="label mt-4">Recipient number</label>
            <input
              className="field"
              placeholder="024 XXX XXXX"
              value={beneficiary}
              onChange={(e) => setBeneficiary(e.target.value.replace(/[^\d]/g, ""))}
              maxLength={10}
              required
              autoFocus
            />
            {numberCheck?.status === "new" && (
              <p className="mt-2 rounded-lg border border-ghRed/25 bg-ghRed/5 p-2.5 text-xs text-ink/70">
                This number hasn't received a delivery from us before. New numbers need a 1GB
                bundle first to activate — larger bundles may not deliver until that's done.
              </p>
            )}
            {numberCheck?.status === "activating" && (
              <p className="mt-2 rounded-lg border border-mtn/40 bg-mtn/10 p-2.5 text-xs text-ink/70">
                This number is still being verified (~{numberCheck.hoursRemaining}h left) — it may
                not deliver instantly yet.
              </p>
            )}
            {status && <p className="mt-3 text-sm text-ghRed">{status}</p>}
            <button className="btn-primary mt-4 w-full" disabled={buying}>
              {buying ? "Starting checkout…" : "Continue to Payment"}
            </button>
          </form>
        </div>
      )}

      <div className="mt-10">
        <UnsupportedSimNotice />
      </div>
    </div>
  );
}
