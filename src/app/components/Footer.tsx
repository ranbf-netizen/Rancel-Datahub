import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-ink/10 bg-sand/40">
      <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <p className="font-display text-lg font-bold text-ink">
            Rancel <span className="text-clay">DataHub</span>
          </p>
          <p className="mt-3 text-sm text-ink/60">
            Affordable data bundles and results checker PINs, delivered fast — pay per order, no wallet needed.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Shop</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/data" className="hover:text-moss">Data Bundles</Link></li>
            <li><Link href="/results" className="hover:text-moss">Results Checker</Link></li>
            <li><Link href="/orders" className="hover:text-moss">My Orders</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Networks</p>
          <ul className="mt-3 space-y-2 text-sm text-ink/70">
            <li>MTN</li>
            <li>Telecel</li>
            <li>AirtelTigo</li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Support</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "233000000000"}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-moss"
              >
                Chat on WhatsApp
              </a>
            </li>
            <li className="text-ink/60">Mon–Sat, 8am–8pm</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink/10 px-5 py-5 text-center text-xs text-ink/50">
        © {new Date().getFullYear()} Rancel DataHub. All rights reserved.
      </div>
    </footer>
  );
}
