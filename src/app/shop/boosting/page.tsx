"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Rocket, Instagram, Facebook, Youtube, Twitter, Send, LayoutGrid } from "lucide-react";

// TikTok and Telegram aren't in lucide-react's icon set, so these are small
// hand-drawn SVGs matching lucide's stroke style (20x20, 1.8 stroke) so the
// row of platform icons looks consistent.
function TikTokIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
    </svg>
  );
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  All: <LayoutGrid size={15} />,
  Instagram: <Instagram size={15} />,
  TikTok: <TikTokIcon size={15} />,
  Facebook: <Facebook size={15} />,
  YouTube: <Youtube size={15} />,
  Twitter: <Twitter size={15} />,
  Telegram: <Send size={15} />,
};

type Service = { service: number; name: string; category: string; min: number; max: number; ghsPer1000: number; refill: boolean };
type Order = { id: string; serviceName: string; link: string; quantity: number; amount: number; paymentStatus: string; panelStatus?: string; createdAt: string };

const PLATFORMS = ["All", "Instagram", "TikTok", "Facebook", "YouTube", "Twitter", "Telegram"];

export default function BoostingPage() {
  const [needAuth, setNeedAuth] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState("All");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetch("/api/boosting/services").then((r) => {
      if (r.status === 401) { setNeedAuth(true); return null; }
      return r.json();
    }).then((d) => { if (d && d.services) setServices(d.services); }).finally(() => setLoading(false));
    fetch("/api/boosting/order").then((r) => r.ok ? r.json() : null).then((d) => { if (d?.orders) setOrders(d.orders); }).catch(() => {});
  }, []);

  // Filter by platform (matches category text) + search.
  const filtered = useMemo(() => {
    return services.filter((s) => {
      if (platform !== "All" && !s.category.toLowerCase().includes(platform.toLowerCase()) && !s.name.toLowerCase().includes(platform.toLowerCase())) return false;
      if (search.trim() && !(`${s.name} ${s.category}`.toLowerCase().includes(search.trim().toLowerCase()))) return false;
      return true;
    });
  }, [services, platform, search]);

  const categories = useMemo(() => Array.from(new Set(filtered.map((s) => s.category))).sort(), [filtered]);
  const servicesInCategory = useMemo(() => filtered.filter((s) => s.category === category), [filtered, category]);
  const selected = services.find((s) => s.service === serviceId);
  const qty = Number(quantity) || 0;
  const charge = selected ? Math.round(selected.ghsPer1000 * (qty / 1000) * 100) / 100 : 0;

  useEffect(() => { if (categories.length && !categories.includes(category)) setCategory(categories[0]); }, [categories]); // eslint-disable-line
  useEffect(() => { if (servicesInCategory.length) setServiceId(servicesInCategory[0].service); else setServiceId(null); }, [category, servicesInCategory.length]); // eslint-disable-line

  async function submit() {
    setError("");
    if (!selected) { setError("Choose a service."); return; }
    if (!link.trim()) { setError("Enter your link."); return; }
    if (qty < selected.min || qty > selected.max) { setError(`Quantity must be between ${selected.min} and ${selected.max}.`); return; }
    setSubmitting(true);
    const res = await fetch("/api/boosting/order", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId: selected.service, link, quantity: qty }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.authorizationUrl) { window.location.href = data.authorizationUrl; return; }
    setError(data.error || "Could not start order.");
  }

  if (needAuth) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <Rocket className="mx-auto text-primary" size={36} />
        <h1 className="mt-4 text-2xl font-bold">Sign in to boost</h1>
        <p className="mt-2 text-slate">Create a free Rancel DataHub account or log in to order social media boosting and track your orders.</p>
        <a href="/register" className="btn-primary mt-5 inline-block">Sign up free</a>
        <a href="/login" className="mt-2 block text-sm text-primary hover:underline">I already have an account</a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Social Media Boosting</p>
      <h1 className="mt-1 text-3xl font-bold">Grow your socials</h1>
      <p className="mt-2 text-slate">Followers, likes, views and more — delivered automatically after payment.</p>

      {loading && <p className="mt-8 inline-flex items-center gap-2 text-slate"><Loader2 size={16} className="animate-spin" /> Loading services…</p>}

      {!loading && services.length > 0 && (
        <div className="card mt-6">
          {/* Platform tabs */}
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button key={p} onClick={() => setPlatform(p)} className={`chip inline-flex items-center gap-1.5 ${platform === p ? "chip-active" : ""}`}>
                {PLATFORM_ICONS[p]}
                {p}
              </button>
            ))}
          </div>

          <input className="field mt-3" placeholder="Search services…" value={search} onChange={(e) => setSearch(e.target.value)} />

          <label className="label mt-4">Category</label>
          <select className="field" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label className="label mt-4">Service</label>
          <select className="field" value={serviceId ?? ""} onChange={(e) => setServiceId(Number(e.target.value))}>
            {servicesInCategory.map((s) => <option key={s.service} value={s.service}>{s.name}</option>)}
          </select>

          <label className="label mt-4">Link</label>
          <input className="field" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} />

          <label className="label mt-4">Quantity</label>
          <input className="field" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          {selected && <p className="mt-1 text-xs text-slate">Min: {selected.min} — Max: {selected.max}</p>}

          <div className="mt-4 flex items-center justify-between rounded-lg bg-mist p-3">
            <span className="text-sm font-medium">Charge</span>
            <span className="text-lg font-bold text-primary">GH₵ {charge.toFixed(2)}</span>
          </div>

          {error && <p className="mt-3 text-sm text-ghRed">{error}</p>}
          <button onClick={submit} disabled={submitting} className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-50">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Starting…" : "Submit Order"}
          </button>
        </div>
      )}

      {!loading && services.length === 0 && !needAuth && (
        <p className="mt-8 text-slate">No boosting services available right now.</p>
      )}

      {/* My orders */}
      {orders.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold">My boosting orders</h2>
          <div className="mt-3 space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="card flex items-center justify-between !p-4 text-sm">
                <div>
                  <p className="font-medium">{o.serviceName}</p>
                  <p className="text-xs text-slate">{o.quantity} · {new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">GH₵ {o.amount.toFixed(2)}</p>
                  <p className={`text-xs font-medium ${o.paymentStatus === "PAID" ? "text-primary" : "text-slate"}`}>
                    {o.paymentStatus === "PAID" ? (o.panelStatus || "Processing") : "Awaiting payment"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
