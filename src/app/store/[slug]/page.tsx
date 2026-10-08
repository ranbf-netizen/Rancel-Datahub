"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Loader2, Zap, ShieldCheck, MessageCircle, BadgeCheck, Info } from "lucide-react";

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
type Announcement = { id: string; title: string; body: string };

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

export default function StorePage({ params }: { params: { slug: string } }) {
  const [storeName, setStoreName] = useState<string>("");
    const [storePhone, setStorePhone] = useState<string>("");
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

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
                setStorePhone(d.storePhone || "");
        setBundles(Array.isArray(d.bundles) ? d.bundles : []);
        const present = Array.from(new Set(d.bundles.map((b: Bundle) => b.network)));
        if (present.length && !present.includes("MTN")) setNetwork(present[0] as string);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    // platform announcement (best-effort)
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((d: Announcement[]) => { if (Array.isArray(d) && d.length > 0) setAnnouncement(d[0]); })
      .catch(() => {});
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

    const whatsapp = storePhone
    ? storePhone.replace(/\D/g, "").replace(/^0/, "233")
    : "";

  return (
    <div className="min-h-screen bg-paper">
      {/* Announcement bar — title fixed, body scrolls */}
      {announcement && (
        <div className="border-b border-primary/20 bg-[#EAF1FE]">
          <style>{`
            @keyframes rdh-store-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
            .rdh-store-track { animation: rdh-store-marquee 25s linear infinite; }
            .rdh-store-track:hover { animation-play-state: paused; }
          `}</style>
          <div className="flex items-center gap-3 py-2.5 text-sm">
            <span className="shrink-0 whitespace-nowrap px-4 font-semibold text-primary">{announcement.title}</span>
            <div className="flex-1 overflow-hidden">
              <div className="rdh-store-track flex w-max whitespace-nowrap text-ink/60">
                {[0, 1].map((dup) => <span key={dup} className="px-8">{announcement.body}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store header */}
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Store" className="h-9 w-9" />
            <div>
              <p className="font-display text-lg font-bold leading-none text-ink">{storeName || "Data Store"}</p>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate">
                <BadgeCheck size={12} className="text-primary" /> Powered by RanCel DataHub
              </p>
            </div>
          </div>
          <a
            href={`https://wa.me/${whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-3 py-2 text-sm font-medium hover:bg-mist"
          >
            <MessageCircle size={15} className="text-[#25D366]" /> Support
          </a>
        </div>
      </header>

            {/* Trust badges */}
      <div className="border-b border-ink/10 bg-mist">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-3 text-xs font-medium text-ink/70">
          <span className="inline-flex items-center gap-1.5"><Zap size={14} className="text-primary" /> Instant delivery</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-primary" /> Secure payment</span>
          <span className="inline-flex items-center gap-1.5"><MessageCircle size={14} className="text-primary" /> WhatsApp support</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Buy Data</p>
        <h1 className="mt-1 text-3xl font-bold sm:text-4xl">Fast, affordable data</h1>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <Info size={18} className="mt-0.5 shrink-0 text-primary" />
          <p className="text-sm text-ink/80">
            Pick a network, pick a bundle, and pay securely — delivered straight to the number you enter.
            <span className="font-medium"> No account needed.</span>
          </p>
        </div>

        {/* Network tabs */}
        <div className="mt-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Object.entries(NETWORK_LABELS)
            .filter(([key]) => networksPresent.length === 0 || networksPresent.includes(key))
            .map(([key, label]) => (
              <button
                key={key}
                onClick={() => { setNetwork(key); setSelected(null); }}
                className={`chip flex shrink-0 items-center gap-2 ${network === key ? NETWORK_ACTIVE_CHIP[key] : ""}`}
              >
                <span className={`h-2 w-2 rounded-full ${network === key ? "bg-current" : NETWORK_DOT[key]}`} />
                {label}
              </button>
            ))}
        </div>

        {/* Search + sort */}
              <div className="mt-5 flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by size, e.g. 5"
          className="field flex-1"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="field w-auto shrink-0">
          <option value="size-asc">Sort: Size (low to high)</option>
          <option value="size-desc">Sort: Size (high to low)</option>
          <option value="price-asc">Sort: Price (low to high)</option>
          <option value="price-desc">Sort: Price (high to low)</option>
        </select>
      </div>

        {/* Bundle cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
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
              className={`group relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                selected?.id === b.id ? "ring-2 ring-primary" : ""
              }`}
            >
              {/* faint dot pattern INSIDE the card */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage: "radial-gradient(rgba(37,99,235,0.12) 1.5px, transparent 1.5px)",
                  backgroundSize: "16px 16px",
                }}
                aria-hidden="true"
              />

              {/* network-colored accent bar */}
              <span className={`absolute inset-x-0 top-0 h-1 ${NETWORK_DOT[b.network] || "bg-primary"}`} aria-hidden="true" />

              {/* content above the dots */}
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold leading-none text-ink">
                    {b.dataSizeGb}<span className="ml-0.5 text-lg font-semibold text-slate">GB</span>
                  </p>
                  <p className="mt-1 text-xs text-slate">{NETWORK_LABELS[b.network]}</p>
                </div>
                {b.id === bestValueId && <span className="badge-value">Best Value</span>}
                {b.id === popularId && b.id !== bestValueId && <span className="badge-popular">Popular</span>}
              </div>

              <p className="relative mt-3 text-xl font-bold text-primary">GH₵ {b.price.toFixed(2)}</p>
              <p className="relative mt-0.5 text-xs text-slate">{b.validityDays} days validity</p>

              <span className={`btn-primary relative mt-4 block w-full text-center !py-2 !text-xs ${NETWORK_BUY_BUTTON[b.network] || ""}`}>
                Buy Now
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-10 border-t border-ink/10 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-8 text-center text-xs text-slate">
          <p className="font-semibold text-ink">{storeName || "Data Store"}</p>
          <p className="mt-1">Instant data delivery for MTN, Telecel &amp; AirtelTigo.</p>
          <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-primary hover:underline">
            <MessageCircle size={13} /> Need help? Chat on WhatsApp
          </a>
          <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-slate/70">
            <BadgeCheck size={11} className="text-primary" /> Powered by RanCel DataHub
          </p>
        </div>
      </footer>

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
                        <button className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2" disabled={buying}>
              {buying && <Loader2 size={16} className="animate-spin" />}
              {buying ? "Starting checkout…" : `Pay GH₵ ${selected.price.toFixed(2)}`}
            </button>
          </form>
        </div>
      )}

      {/* Floating WhatsApp button with blinking green light */}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Hi, I need help with an order")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition hover:scale-105"
          aria-label="Chat on WhatsApp"
        >
          <MessageCircle size={26} className="text-white" />
          <span className="absolute right-0 top-0 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-white" />
          </span>
        </a>
      )}
    </div>
  );
}


  
