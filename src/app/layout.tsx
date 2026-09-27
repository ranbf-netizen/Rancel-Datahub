import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/auth";
import LogoutButton from "./components/LogoutButton";
import MobileNav from "./components/MobileNav";
import WhatsAppButton from "./components/WhatsAppButton";
import Footer from "./components/Footer";
import AnnouncementBanner from "./components/AnnouncementBanner";
import ChromeGate, { StorefrontBar } from "./components/ChromeGate";
import VisitTracker from "./components/VisitTracker";
import { Signal, LogIn, UserRoundPlus } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Rancel DataHub",
  description: "Buy data bundles and results checker PINs in seconds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Suspense fallback={null}><VisitTracker /></Suspense>
        <Suspense fallback={null}>
        <ChromeGate>
        <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
            <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold text-ink">
  <img src="/logo.svg" alt="RanCel DataHub" className="h-9 w-9" />
  <span>RanCel <span className="text-primary">DataHub</span></span>
</Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-5 text-sm font-medium lg:flex">
              <Link href="/data" className="hover:text-primary">Buy Data</Link>
              <Link href="/track" className="hover:text-primary">Track</Link>
              <Link href="/agents" className="hover:text-primary">Agents</Link>
              <Link href="/results" className="hover:text-primary">Results</Link>
              <Link href="/afa" className="hover:text-primary">AFA</Link>
              <Link href="/updates" className="hover:text-primary">Updates</Link>
              <Link href="/tools" className="hover:text-primary">AI Tools</Link>
              <Link href="/shop" className="hover:text-primary">Shop</Link>

              {/* divider between browse links and account actions */}
              <span className="h-5 w-px bg-ink/15" />

              {session ? (
                <>
                  <Link href="/orders" className="hover:text-primary">My Orders</Link>
                  <Link href="/agent" className="hover:text-primary">Dashboard</Link>
                  {session.role === "ADMIN" && (
                    <Link href="/admin" className="hover:text-primary">Admin</Link>
                  )}
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="inline-flex items-center gap-1.5 hover:text-primary">
                    <LogIn size={15} /> Log in
                  </Link>
                  <Link href="/register" className="btn-primary inline-flex items-center gap-1.5 !px-4 !py-2">
                    <UserRoundPlus size={15} /> Sign up
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile nav */}
            <MobileNav session={session} />
          </div>
        </header>
        <AnnouncementBanner />
        </ChromeGate>
        </Suspense>

        <Suspense fallback={null}>
        <StorefrontBar />
        </Suspense>
        <main>{children}</main>
        <Suspense fallback={null}>
        <ChromeGate>
        <Footer />
        <WhatsAppButton />
        </ChromeGate>
        </Suspense>
      </body>
    </html>
  );
}
