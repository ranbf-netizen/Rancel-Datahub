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
  { q: "How is this product delivered?", a: "Delivery depends on the product. Instant-delivery items are provided after payment confirmation, while manually fulfilled orders are processed by our team." },
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
  if (p.deliveryType === "MANUAL") return "Manual fulfilment";
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

       "use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Option = {
  id?: string;
  name: string;
  price: number;
  stock?: number | null;
};

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  productType?: string | null;
  deliveryType?: string | null;
  options?: Option[];
};

function receiveLabel(p: Product) {
  if (p.productType === "BOOSTING") return "Manual fulfilment";
  if (p.deliveryType === "MANUAL") return "Manual fulfilment";
  if (p.deliveryType === "LINK") return "Access link";
  if (p.deliveryType === "REVEAL") return "Instant details";
  if (p.deliveryType === "GMAIL_LATEST") return "Auto Delivered";

  return "Download";
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-right text-sm font-medium text-gray-900">
        {value}
      </span>
    </div>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");

  const [selectedOption, setSelectedOption] = useState<Option | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function loadProduct() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/digital-products/${params.id}`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error("Failed to load product");
        }

        const data = await res.json();

        const loadedProduct: Product = data.product ?? data;

        setProduct(loadedProduct);

        if (loadedProduct.options && loadedProduct.options.length > 0) {
          setSelectedOption(loadedProduct.options[0]);
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load this product.");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [params.id]);

  const currentPrice = useMemo(() => {
    if (selectedOption) {
      return Number(selectedOption.price || 0);
    }

    return Number(product?.price || 0);
  }, [product, selectedOption]);

  const currentStock = useMemo(() => {
    if (selectedOption?.stock !== undefined) {
      return selectedOption.stock;
    }

    return null;
  }, [selectedOption]);

  const totalPrice = currentPrice * quantity;

  async function handleBuy() {
    if (!product) return;

    try {
      setBuying(true);
      setError("");

      const res = await fetch("/api/digital-products/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          optionId: selectedOption?.id ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Unable to continue with checkout.");
      }

      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      router.push(
        `/shop/checkout?product=${encodeURIComponent(product.id)}${
          selectedOption?.id
            ? `&option=${encodeURIComponent(selectedOption.id)}`
            : ""
        }&quantity=${quantity}`
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setBuying(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="mb-8 h-8 w-48 rounded bg-gray-200" />

            <div className="grid gap-8 lg:grid-cols-2">
              <div className="h-[420px] rounded-2xl bg-gray-200" />

              <div className="space-y-4">
                <div className="h-10 w-3/4 rounded bg-gray-200" />
                <div className="h-6 w-1/3 rounded bg-gray-200" />
                <div className="h-32 rounded bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            Product unavailable
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {error || "This product could not be found."}
          </p>

          <button
            type="button"
            onClick={() => router.push("/shop")}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Back to Shop
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => router.push("/shop")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-gray-900"
        >
          ← Back to Shop
        </button>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Product Image */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex min-h-[380px] items-center justify-center bg-gray-100">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full max-h-[500px] w-full object-contain"
                />
              ) : (
                <div className="flex h-[380px] w-full items-center justify-center text-sm text-gray-400">
                  No image available
                </div>
              )}
            </div>
          </div>

          {/* Product Information */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
                {product.name}
              </h1>

              <div className="mt-3 flex items-center gap-3">
                <span className="text-2xl font-bold text-blue-600">
                  GH₵{currentPrice.toFixed(2)}
                </span>

                {currentStock !== null && (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      currentStock > 0
                        ? "bg-green-50 text-green-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {currentStock > 0
                      ? `${currentStock} in stock`
                      : "Out of stock"}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h2 className="mb-2 text-sm font-semibold text-gray-900">
                  Description
                </h2>

                <div className="whitespace-pre-line text-sm leading-6 text-gray-600">
                  {product.description}
                </div>
              </div>
            )}

            {/* Options */}
            {product.options && product.options.length > 0 && (
              <div className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-gray-900">
                  Select an option
                </h2>

                <div className="grid gap-3">
                  {product.options.map((option, index) => {
                    const isSelected =
                      selectedOption?.id === option.id ||
                      (!selectedOption?.id &&
                        selectedOption?.name === option.name);

                    const optionStock = option.stock;

                    return (
                      <button
                        key={option.id ?? `${option.name}-${index}`}
                        type="button"
                        onClick={() => setSelectedOption(option)}
                        className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 ring-1 ring-blue-600"
                            : "border-gray-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {option.name}
                          </p>

                          {optionStock !== undefined &&
                            optionStock !== null && (
                              <p className="mt-1 text-xs text-gray-500">
                                {optionStock > 0
                                  ? `${optionStock} available`
                                  : "Out of stock"}
                              </p>
                            )}
                        </div>

                        <span className="font-semibold text-blue-600">
                          GH₵{Number(option.price).toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">
                Quantity
              </h2>

              <div className="flex w-fit items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((value) => Math.max(1, value - 1))
                  }
                  className="px-4 py-3 text-lg text-gray-600 transition hover:bg-gray-50"
                >
                  −
                </button>

                <span className="min-w-[50px] border-x border-gray-200 px-4 py-3 text-center text-sm font-semibold text-gray-900">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() => setQuantity((value) => value + 1)}
                  className="px-4 py-3 text-lg text-gray-600 transition hover:bg-gray-50"
                >
                  +
                </button>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 px-4">
              <Row
                label="How you'll receive it"
                value={receiveLabel(product)}
              />

              <Row
                label="Product type"
                value={
                  product.productType === "BOOSTING"
                    ? "Social Media Boosting"
                    : product.productType || "Digital Product"
                }
              />

              <Row
                label="Total"
                value={`GH₵${totalPrice.toFixed(2)}`}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Buy Button */}
            <button
              type="button"
              onClick={handleBuy}
              disabled={
                buying ||
                (currentStock !== null && currentStock <= 0)
              }
              className="w-full rounded-xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {buying
                ? "Processing..."
                : currentStock !== null && currentStock <= 0
                ? "Out of Stock"
                : `Buy Now — GH₵${totalPrice.toFixed(2)}`}
            </button>

            <p className="mt-3 text-center text-xs text-gray-400">
              Secure checkout. Your order will be processed after payment.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}