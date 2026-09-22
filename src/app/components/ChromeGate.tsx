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

  return (
    <header className="border-b border-ink/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <span className="font-display text-xl font-bold text-ink">
          RanCel <span className="text-primary">DataHub</span>
        </span>
        <nav className="flex items-center gap-4 text-sm font-medium sm:gap-6">
          <Link href={`/track${q}`} className="hover:text-primary">Track Order</Link>
          <Link href={`/afa${q}`} className="hover:text-primary">AFA Registration</Link>
          <Link href={`/results${q}`} className="hover:text-primary">Results Checker</Link>
        </nav>
      </div>
    </header>
  );
}
