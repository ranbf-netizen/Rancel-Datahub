import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSession } from "@/lib/auth";
import LogoutButton from "./components/LogoutButton";
import MobileNav from "./components/MobileNav";
import WhatsAppButton from "./components/WhatsAppButton";
import Footer from "./components/Footer";

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
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <header className="relative border-b border-ink/10 bg-paper/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
            <Link href="/" className="font-display text-xl font-bold text-ink">
              Rancel <span className="text-clay">DataHub</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
              <Link href="/data" className="hover:text-moss">Data Bundles</Link>
              <Link href="/results" className="hover:text-moss">Results Checker</Link>
              {session ? (
                <>
                  <Link href="/orders" className="hover:text-moss">My Orders</Link>
                  {session.role === "ADMIN" && (
                    <Link href="/admin" className="hover:text-moss">Admin</Link>
                  )}
                  <LogoutButton />
                </>
              ) : (
                <>
                  <Link href="/login" className="hover:text-moss">Log in</Link>
                  <Link href="/register" className="btn-primary !px-4 !py-2">Sign up</Link>
                </>
              )}
            </nav>

            {/* Mobile nav */}
            <MobileNav session={session} />
          </div>
        </header>

        <main>{children}</main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  );
}
