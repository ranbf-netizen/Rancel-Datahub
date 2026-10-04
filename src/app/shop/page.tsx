"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Download,
  TrendingUp,
  Zap,
  Star,
  ArrowRight,
} from "lucide-react";
import BoostingGraphic from "../components/BoostingGraphic";
import SmsNumbersGraphic from "../components/SmsNumbersGraphic";

type ProductOption = {
  name?: string;
  label?: string;
  title?: string;
  price?: number;
  stock?: number | null;
};

type Product = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  price: number;
  coverUrl?: string;
  productType: string;
  outOfStock?: boolean;
  stock?: number | null;
  optionsJson?: ProductOption[] | null;
  platform?: string;
  quantity?: string;
  featured?: boolean;
  instantDelivery?: boolean;
};

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    fetch("/api/digital-products")
      .then((r) => r.json())
      .then((d) => setProducts(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();

    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });

    return ["All", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (category !== "All" && p.category !== category) return false;

      if (
        search.trim() &&
        !p.title.toLowerCase().includes(search.trim().toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [products, category, search]);

  const featured = useMemo(
    () => filtered.filter((p) => p.featured).slice(0, 4),
    [filtered]
  );

  function getDisplayStock(p: Product): number | null {
    if (Array.isArray(p.optionsJson) && p.optionsJson.length > 0) {
      const matchingOption = p.optionsJson.find(
        (option) =>
          typeof option.price === "number" &&
          Number(option.price) === Number(p.price)
      );

      if (
        matchingOption &&
        matchingOption.stock !== null &&
        matchingOption.stock !== undefined
      ) {
        return Number(matchingOption.stock);
      }

      const firstStockOption = p.optionsJson.find(
        (option) =>
          option.stock !== null &&
          option.stock !== undefined
      );

      if (
        firstStockOption &&
        firstStockOption.stock !== null &&
        firstStockOption.stock !== undefined
      ) {
        return Number(firstStockOption.stock);
      }

      return null;
    }

    if (p.stock !== null && p.stock !== undefined) {
      return Number(p.stock);
    }

    return null;
  }

  function ProductCard({ p }: { p: Product }) {
    const boosting = p.productType === "BOOSTING";
    const displayStock = getDisplayStock(p);

    const isOutOfStock =
      displayStock !== null
        ? displayStock <= 0
        : Boolean(p.outOfStock);

    return (
      <Link
        href={`/shop/${p.id}`}
        className={`card hover-lift relative flex h-full flex-col text-left ${
          isOutOfStock ? "opacity-60" : ""
        }`}
      >
        {p.featured && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-ink shadow">
            Featured
          </span>
        )}

        <div className="mb-3 aspect-square w-full shrink-0 overflow-hidden rounded-lg bg-mist">
          {p.coverUrl ? (
            <img
              src={p.coverUrl}
              alt={p.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate">
              {boosting ? (
                <TrendingUp size={30} />
              ) : (
                <Download size={30} />
              )}
            </div>
          )}
        </div>

        <p className="font-semibold text-ink">{p.title}</p>

        <p className="mt-0.5 font-bold text-ink">
          GH₵ {p.price.toFixed(2)}
        </p>

        {isOutOfStock ? (
          <p className="mt-0.5 text-xs font-semibold text-ghRed">
            Out of stock
          </p>
        ) : displayStock !== null ? (
          <p className="mt-0.5 text-xs font-semibold text-slate">
            {displayStock} in stock
          </p>
        ) : boosting ? (
          <p className="mt-0.5 text-xs text-slate">
            {p.quantity || "Options available"}
          </p>
        ) : null}

        {p.instantDelivery && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <Zap size={12} />
            Instant delivery
          </p>
        )}

        <span className="mt-auto flex items-center justify-between pt-3 text-sm font-medium text-primary">
          View product
          <ArrowRight size={16} />
        </span>
      </Link>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="field !rounded-full !py-3"
        />
      </div>

      {/* Social Media Boosting + SMS Numbers - one row, square-ish cards so they sit side by side on mobile too */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/shop/boosting"
          className="card hover-lift flex flex-col overflow-hidden !p-0"
        >
          <div className="aspect-square w-full">
            <BoostingGraphic />
          </div>

          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Boosting
            </p>

            <p className="mt-0.5 text-sm font-semibold leading-snug text-ink">
              Followers, likes &amp; views
            </p>

            <p className="mt-0.5 text-xs text-slate">
              Tap to browse →
            </p>
          </div>
        </Link>

        {/*<Link
          href="/shop/sms-numbers"
          className="card hover-lift flex flex-col overflow-hidden !p-0"
        >
          <div className="aspect-square w-full overflow-hidden">
            <SmsNumbersGraphic />
          </div>

          <div className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              SMS Numbers
            </p>

            <p className="mt-0.5 text-sm font-semibold leading-snug text-ink">
              Rent a verification number
            </p>

            <p className="mt-0.5 text-xs text-slate">
              Tap to browse →
            </p>
          </div>
        </Link>*/}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`chip shrink-0 ${
              category === c ? "chip-active" : ""
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {loading && (
        <p className="mt-8 inline-flex items-center gap-2 text-slate">
          <Loader2 size={16} className="animate-spin" />
          Loading…
        </p>
      )}

      {!loading && featured.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Star size={18} className="text-mtn" />
            Top picks
          </h2>

          <div className="mt-4 flex items-stretch gap-4 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((p) => (
              <div
                key={p.id}
                className="flex w-[70%] shrink-0 snap-start sm:w-[45%] lg:w-[23%]"
              >
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {!loading && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">All products</h2>

            <span className="text-sm text-slate">
              {filtered.length} result
              {filtered.length === 1 ? "" : "s"}
            </span>
          </div>

          {filtered.length === 0 ? (
            <p className="mt-6 text-slate">No products found.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}