"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// A visitor is "in storefront context" when they're on a /store/<slug> page,
// OR on a shared page (like /track) that carries a ?store=<slug> marker set by
// the storefront links. In that context we hide the main site chrome and show a
// dedicated bar instead — so an agent's customer never sees a route to the main
// site, even on Track / AFA / Results.
function useStoreContext() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const slugFromPath = pathname?.startsWith("/store/") ? pathname.split("/")[2] : null;
  const slug = slugFromPath || sp.get("store");
  const inStore = !!pathname?.startsWith("/store/") || !!sp.get("store");
  return { inStore, slug };
}

// Wraps the main header/footer — renders nothing in storefront context.
export default function ChromeGate({ children }: { children: React.ReactNode }) {
  const { inStore } = useStoreContext();
  if (inStore) return null;
  return <>{children}</>;
}

// The dedicated storefront bar — shown ONLY in storefront context. Its links
// carry the ?store=<slug> marker so the customer stays contained as they move
// between Track / AFA / Results.
export function StorefrontBar() {
  const { inStore, slug } = useStoreContext();
  if (!inStore) return null;
  const q = slug ? `?store=${encodeURIComponent(slug)}` : "";
  const storeHome = slug ? `/store/${slug}` : "/";

  return (
    <header className="border-b border-ink/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        {/* Brand — links back to the store */}
        <Link href={storeHome} className="shrink-0 font-display text-base font-bold text-ink sm:text-xl">
          RanCel <span className="text-primary">DataHub</span>
        </Link>
        {/* Nav — scrolls on mobile, shorter labels */}
        <nav className="flex items-center gap-3 overflow-x-auto text-sm font-medium [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-5">
          <Link href={storeHome} className="shrink-0 whitespace-nowrap hover:text-primary">Buy Data</Link>
          <Link href={`/track${q}`} className="shrink-0 whitespace-nowrap hover:text-primary">Track</Link>
          <Link href={`/afa${q}`} className="shrink-0 whitespace-nowrap hover:text-primary">AFA</Link>
          <Link href={`/results${q}`} className="shrink-0 whitespace-nowrap hover:text-primary">Results</Link>
        </nav>
      </div>
    </header>
  );
}
