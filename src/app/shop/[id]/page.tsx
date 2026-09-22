"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Zap, Check, ArrowLeft, ChevronDown, MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "233000000000";

type Product = {
  id: string; title: string; description?: string; instructions?: string; category?: string;
  price: number; coverUrl?: string; productType: string; deliveryType?: string;
  platform?: string; quantity?: string; deliveryEstimate?: string; requirements?: string;
  instantDelivery?: boolean; outOfStock?: boolean; stock?: number | null;
  optionsJson?: string; deliveryMethods?: string; requireWhatsapp?: boolean;
};
type Related = { id: string; title: string; price: number; coverUrl?: string; platform?: string; productType: string };

const FAQS = [
  { q: "How is this product delivered?", a: "After your payment is confirmed, you receive your product on the confirmation page — instantly for instant-delivery items, or as described in the instructions." },
  { q: "What information do I need to provide?", a: "Just a valid email address for your order and updates. Provide only the information requested in the order form." },
  { q: "How do I track my order?", a: "Keep your payment reference from checkout — you can use it to track your order status." },
  { q: "When does fulfilment start?", a: "Fulfilment begins as soon as your payment is verified by our system." },
];

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Related[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<"about" | "how" | "req">("about");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [chosenOption, setChosenOption] = useState<string>("");
  const [deliveryMethod, setDeliveryMethod] = useState<string>("");
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");

  // Parse options (JSON array of { name, price }) and delivery methods.
  const options: { name: string; price: number }[] = (() => {
    try { return product?.optionsJson ? JSON.parse(product.optionsJson) : []; } catch { return []; }
  })();
  const methods: string[] = (product?.deliveryMethods || "DIGITAL").split(",").map((m) => m.trim()).filter(Boolean);

  // Effective price = chosen option's price if options exist, else base price.
  const selectedOption = options.find((o) => o.name === chosenOption);
  const effectivePrice = selectedOption ? selectedOption.price : (product?.price ?? 0);

  // Default the delivery method to the only/first one.
  useEffect(() => {
    if (methods.length && !deliveryMethod) setDeliveryMethod(methods[0]);
    if (options.length && !chosenOption) setChosenOption(options[0].name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  useEffect(() => {
    fetch(`/api/digital-products/${params.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setProduct(d.product); setRelated(d.related || []); })
      .catch(() => setNotFound(true));
    // analytics: product view (best-effort)
    fetch("/api/analytics/track", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "product_view", productId: params.id, path: `/shop/${params.id}` }),
    }).catch(() => {});
  }, [params.id]);

  async function buy() {
    if (!product) return;
    setError("");
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) { setError("Enter a valid email to continue."); return; }
    if (product.productType === "BOOSTING" && !socialLink.trim()) { setError("Please provide the link to boost."); return; }
    if (product.requireWhatsapp && !whatsapp.trim()) { setError("A WhatsApp number is required for this order."); return; }
    setBuying(true);
    fetch("/api/analytics/track", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "checkout_start", productId: product.id }),
    }).catch(() => {});
    const res = await fetch("/api/digital-products/buy", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, email, socialLink, note, whatsapp, chosenOption, deliveryMethod }),
    });
    const data = await res.json();
    setBuying(false);
    if (data.authorizationUrl) { window.location.href = data.authorizationUrl; return; }
    setError(data.error || "Could not start checkout.");
  }

  function receiveLabel(p: Product) {
    if (p.productType === "BOOSTING") return "Manual fulfilment";
    if (p.deliveryType === "LINK") return "Access link";
    if (p.deliveryType === "REVEAL") return "Instant details";
    return "Download";
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-md px-5 py-20 text-center">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <Link href="/shop" className="mt-4 inline-block text-primary hover:underline">← Back to shop</Link>
      </div>
    );
  }
  if (!product) {
    return <div className="mx-auto max-w-md px-5 py-20 text-center text-slate"><Loader2 className="mx-auto animate-spin" /> Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-8">
      <Link href="/shop" className="inline-flex items-center gap-1 text-sm text-primary hover:underline"><ArrowLeft size={15} /> Back to store</Link>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {/* Left: product summary */}
        <div className="card">
          <div className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-mist">
            {product.coverUrl
              ? <img src={product.coverUrl} alt={product.title} className="h-full w-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center text-slate">No image</div>}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{product.platform || product.category || "Digital"}</p>
            {product.productType === "BOOSTING" && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">Boosting</span>}
          </div>
          <h1 className="mt-1 text-3xl font-bold">{product.title}</h1>
          {product.description && <p className="mt-2 text-sm text-slate">{product.description}</p>}

          <div className="mt-4 divide-y divide-ink/5 rounded-xl border border-ink/10 text-sm">
            <Row label="Price" value={`GH₵ ${product.price.toFixed(2)}`} strong />
            <Row label="How you'll receive it" value={receiveLabel(product)} />
            <Row label="Stock" value={product.outOfStock ? "Out of stock" : product.stock == null ? "Available" : `${product.stock} available`} />
            {product.quantity && <Row label="Quantity" value={product.quantity} />}
            {product.deliveryEstimate && <Row label="Delivery" value={product.deliveryEstimate} />}
          </div>

          {product.instantDelivery && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/5 p-3 text-sm text-primary">
              <Zap size={16} /> <span className="font-medium">Instant delivery after payment.</span>
            </div>
          )}
        </div>

        {/* Right: order form */}
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Order details</p>
          <h2 className="mt-1 text-2xl font-bold">Complete your order</h2>
          <p className="mt-1 text-sm text-slate">Provide the details needed to process your order.</p>

          {product.instructions && (
            <div className="mt-4 rounded-lg bg-mist p-3 text-sm text-ink/80">
              <p className="font-medium text-ink">Instructions</p>
              <p className="mt-1 whitespace-pre-wrap">{product.instructions}</p>
            </div>
          )}

          {product.productType === "BOOSTING" && (
            <>
              <label className="label mt-4">Link to boost</label>
              <input className="field" placeholder="e.g. your Instagram post or profile URL" value={socialLink} onChange={(e) => setSocialLink(e.target.value)} />
            </>
          )}

          {/* Delivery method choice */}
          {methods.length > 1 && (
            <>
              <label className="label mt-4">How will you receive it?</label>
              <div className="grid grid-cols-2 gap-2">
                {methods.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDeliveryMethod(m)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${deliveryMethod === m ? "border-primary bg-primary/5 text-primary" : "border-ink/10 hover:border-primary/30"}`}
                  >
                    {m === "ACTIVATION" ? "Activation" : "Digital delivery"}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Options / packages */}
          {options.length > 0 && (
            <>
              <label className="label mt-4">Choose a package</label>
              <select className="field" value={chosenOption} onChange={(e) => setChosenOption(e.target.value)}>
                {options.map((o) => (
                  <option key={o.name} value={o.name}>{o.name} — GH₵ {o.price.toFixed(2)}</option>
                ))}
              </select>
            </>
          )}

          {product.requireWhatsapp && (
            <>
              <label className="label mt-4">WhatsApp number (required)</label>
              <input className="field" placeholder="024 XXX XXXX" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
              <p className="mt-1 text-xs text-slate">We&rsquo;ll contact you here to complete your order.</p>
            </>
          )}

          <label className="label mt-4">Email address (required for payment)</label>
          <input className="field" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label className="label mt-4">Note (optional)</label>
          <textarea className="field" rows={2} placeholder="Any final instruction for us." value={note} onChange={(e) => setNote(e.target.value)} />

          {error && <p className="mt-3 text-sm text-ghRed">{error}</p>}

          <button onClick={buy} disabled={buying || product.outOfStock} className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-50">
            {buying && <Loader2 size={16} className="animate-spin" />}
            {product.outOfStock ? "Out of stock" : buying ? "Starting payment…" : `Continue to payment — GH₵ ${effectivePrice.toFixed(2)}`}
          </button>

          {/* Order on WhatsApp — for customers who prefer to order directly */}
          {!product.outOfStock && (
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I want to order: ${product.title} (GH₵ ${product.price.toFixed(2)})${note ? `\nNote: ${note}` : ""}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex w-full items-center gap-3 rounded-xl border border-ink/10 px-4 py-3 text-left transition hover:bg-mist"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#25D366] text-white">
                <MessageCircle size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-ink">Order on WhatsApp</span>
                <span className="block text-xs text-slate">Your order details will be ready to send in WhatsApp.</span>
              </span>
            </a>
          )}
        </div>
      </div>

      {/* Info tabs */}
      <div className="card mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Product information</p>
        <h2 className="mt-1 text-xl font-bold">Everything you need before you order</h2>
        <div className="mt-4 flex flex-wrap gap-2 border-b border-ink/10 pb-3">
          {([["about", "About"], ["how", "How it works"], ["req", "Requirements"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`chip ${tab === k ? "chip-active" : ""}`}>{label}</button>
          ))}
        </div>
        <div className="mt-4 text-sm text-ink/80">
          {tab === "about" && <p>{product.description || `About ${product.title}. Choose the option above and complete checkout using the details requested for your order.`}</p>}
          {tab === "how" && (
            <ol className="list-decimal space-y-2 pl-5">
              <li>Choose the product you want and complete payment.</li>
              <li>Provide only the information requested in the order form.</li>
              <li>After payment is confirmed, follow the delivery instructions for your order.</li>
            </ol>
          )}
          {tab === "req" && (
            <ul className="space-y-2">
              {(product.requirements ? product.requirements.split("\n") : ["Provide a valid email address.", "Provide only the information requested in the order form.", "Keep your order reference so you can track delivery status."]).map((r, i) => (
                <li key={i} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-primary" /> {r}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Questions customers ask</p>
        <h2 className="mt-1 text-xl font-bold">Frequently asked questions</h2>
        <div className="mt-4 space-y-2">
          {FAQS.map((f, i) => (
            <div key={i} className="card !p-0">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium">
                {f.q} <ChevronDown size={16} className={`transition ${openFaq === i ? "rotate-180" : ""}`} />
              </button>
              {openFaq === i && <p className="px-4 pb-4 text-sm text-slate">{f.a}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Related products</h2>
            <Link href="/shop" className="text-sm text-primary hover:underline">View store</Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <Link key={r.id} href={`/shop/${r.id}`} className="card hover-lift">
                <div className="aspect-square w-full overflow-hidden rounded-lg bg-mist">
                  {r.coverUrl ? <img src={r.coverUrl} alt={r.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-slate">No image</div>}
                </div>
                <p className="mt-2 font-semibold text-ink">{r.title}</p>
                <p className="mt-0.5 font-bold text-primary">GH₵ {r.price.toFixed(2)}</p>
                <span className="mt-1 block text-sm text-primary">View product →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-slate">{label}</span>
      <span className={strong ? "font-bold text-ink" : "font-medium text-ink"}>{value}</span>
    </div>
  );
}
