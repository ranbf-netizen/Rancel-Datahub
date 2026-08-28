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
        <Suspense fallback={null}>
        <ChromeGate>
        <header className="relative border-b border-ink/10 bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link href="/" className="font-display text-xl font-bold text-ink">
              RanCel <span className="text-primary">DataHub</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
              <Link href="/data" className="hover:text-primary">Buy Data</Link>
              <Link href="/track" className="hover:text-primary">Track Order</Link>
              <Link href="/agents" className="hover:text-primary">Become an Agent</Link>
              <Link href="/results" className="hover:text-primary">Results Checker</Link>
              <Link href="/afa" className="hover:text-primary">AFA Registration</Link>
              <Link href="/updates" className="hover:text-primary">Updates</Link>
              {session ? (
                <>
                  <Link href="/orders" className="hover:text-primary">My Orders</Link>
                  <Link href="/agent" className="hover:text-primary">Agent Dashboard</Link>
                  {session.role === "ADMIN" && (
                    <Link href="/admin" className="hover:text-primary">Admin</Link>
                  )}
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:text-primary">Log in</Link>
                  <Link href="/register" className="btn-primary !px-4 !py-2">Sign up</Link>
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
