"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import VerifyNumberWidget from "../../components/VerifyNumberWidget";

type Bundle = {
  id: string;
  network: string;
  dataSizeGb: number;
  validityDays: number;
  price: number; // already marked up for this store
};

const NETWORK_LABELS: Record<string, string> = {
  MTN: "MTN",
  TELECEL: "Telecel",
  AIRTELTIGO_ISHARE: "AirtelTigo (iShare)",
  AIRTELTIGO_BIGTIME: "AirtelTigo (BigTime)",
};

const NETWORK_DOT: Record<string, string> = {
  MTN: "bg-mtn",
  TELECEL: "bg-telecel",
  AIRTELTIGO_ISHARE: "bg-airteltigo",
  AIRTELTIGO_BIGTIME: "bg-airteltigo",
};

const NETWORK_ACTIVE_CHIP: Record<string, string> = {
  MTN: "!border-transparent !bg-mtn !text-ink",
  TELECEL: "!border-transparent !bg-telecel !text-white",
  AIRTELTIGO_ISHARE: "!border-transparent !bg-airteltigo !text-white",
  AIRTELTIGO_BIGTIME: "!border-transparent !bg-airteltigo !text-white",
};

const NETWORK_BUY_BUTTON: Record<string, string> = {
  MTN: "!bg-mtn !text-ink hover:!bg-mtn/90",
  TELECEL: "!bg-telecel !text-white hover:!bg-telecel/90",
  AIRTELTIGO_ISHARE: "!bg-airteltigo !text-white hover:!bg-airteltigo/90",
  AIRTELTIGO_BIGTIME: "!bg-airteltigo !text-white hover:!bg-airteltigo/90",
};

type SortKey = "price-asc" | "price-desc" | "size-asc" | "size-desc";

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

export default function StorePage({ params }: { params: { slug: string } }) {
  const [storeName, setStoreName] = useState<string>("");
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [network, setNetwork] = useState("MTN");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("size-asc");
  const [selected, setSelected] = useState<Bundle | null>(null);
  const [beneficiary, setBeneficiary] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    fetch(`/api/store/${params.slug}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setStoreName(d.storeName);
        setBundles(Array.isArray(d.bundles) ? d.bundles : []);
        const present = Array.from(new Set(d.bundles.map((b: Bundle) => b.network)));
        if (present.length && !present.includes("MTN")) setNetwork(present[0] as string);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.slug]);

  const networksPresent = Array.from(new Set(bundles.map((b) => b.network)));

  const filtered = useMemo(() => {
    let list = bundles.filter((b) => b.network === network);
    if (search.trim()) list = list.filter((b) => b.dataSizeGb.toString().includes(search.trim()));
    switch (sort) {
      case "price-asc": list = [...list].sort((a, b) => a.price - b.price); break;
      case "price-desc": list = [...list].sort((a, b) => b.price - a.price); break;
      case "size-desc": list = [...list].sort((a, b) => b.dataSizeGb - a.dataSizeGb); break;
      default: list = [...list].sort((a, b) => a.dataSizeGb - b.dataSizeGb);
    }
    return list;
  }, [bundles, network, search, sort]);

  const { bestValueId, popularId } = useMemo(() => {
    const nb = bundles.filter((b) => b.network === network);
    if (nb.length === 0) return { bestValueId: null as string | null, popularId: null as string | null };
    const bestValue = nb.reduce((best, b) => (b.price / b.dataSizeGb < best.price / best.dataSizeGb ? b : best));
    const avg = nb.reduce((s, b) => s + b.dataSizeGb, 0) / nb.length;
    const popular = nb.reduce((c, b) => (Math.abs(b.dataSizeGb - avg) < Math.abs(c.dataSizeGb - avg) ? b : c));
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
    const res = await fetch(`/api/store/${params.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundleId: selected.id, beneficiaryNumber: beneficiary }),
    });
    const data = await res.json();
    setBuying(false);
    if (data.authorizationUrl) { window.location.href = data.authorizationUrl; return; }
    setStatus(data.error || "Payment could not be started.");
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="text-2xl font-bold">Store not found</h1>
        <p className="mt-2 text-slate">This storefront link doesn&rsquo;t exist or is no longer active.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Data Store</p>
      <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{storeName || "Loading store…"}</h1>
      <p className="mt-2 max-w-xl text-slate">
        Pick a network, pick a bundle, and pay securely — delivered straight to the number you enter.
        No account needed.
      </p>

            {/* <div className="mt-6 max-w-md">
        <VerifyNumberWidget />
      </div> */}

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
            <p className="mt-1 text-lg font-semibold text-primary">GH₵ {b.price.toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate">{b.validityDays} Days validity</p>
            <span className={`btn-primary mt-4 w-full !py-2 !text-xs ${NETWORK_BUY_BUTTON[b.network] || ""}`}>Buy Now</span>
          </button>
        ))}
      </div>

      {/* Checkout modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-5" onClick={() => setSelected(null)}>
          <form onSubmit={handleBuy} onClick={(e) => e.stopPropagation()} className="card w-full max-w-md">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {selected.dataSizeGb}GB · {NETWORK_LABELS[selected.network]} — GH₵ {selected.price.toFixed(2)}
                </h2>
                <p className="mt-1 text-xs text-slate">Valid for {selected.validityDays} days · Fast delivery</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="shrink-0 text-slate hover:text-ink">
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
            {status && <p className="mt-3 text-sm text-ghRed">{status}</p>}
            <button className="btn-primary mt-4 w-full" disabled={buying}>
              {buying ? "Starting checkout…" : `Pay GH₵ ${selected.price.toFixed(2)}`}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
