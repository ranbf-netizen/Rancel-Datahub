import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-ink/10 bg-mist">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-5 py-12 md:grid-cols-5">
        <div className="sm:col-span-2 md:col-span-1">
          <p className="font-display text-lg font-bold text-ink">
            RanCel <span className="text-primary">DataHub</span>
          </p>
          <p className="mt-3 text-sm text-ink/60">Affordable connectivity for everyone.</p>
          <div className="mt-4 flex gap-1.5">
            <span className="h-1.5 w-5 rounded-full bg-ghRed" />
            <span className="h-1.5 w-5 rounded-full bg-ghGold" />
            <span className="h-1.5 w-5 rounded-full bg-ghGreen" />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Product</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/data" className="hover:text-primary">Buy Data</Link></li>
            <li><Link href="/track" className="hover:text-primary">Track Order</Link></li>
            <li><Link href="/agents" className="hover:text-primary">Become an Agent</Link></li>
            <li><Link href="/results" className="hover:text-primary">Results Checker</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Company</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-primary">About</Link></li>
            <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
            <li><Link href="/faq" className="hover:text-primary">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">Legal</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-primary">Terms & Conditions</Link></li>
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
                className="hover:text-primary"
              >
                WhatsApp
              </a>
            </li>
            <li><Link href="/contact" className="hover:text-primary">Email</Link></li>
            <li><Link href="/faq" className="hover:text-primary">Help Center</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink/10 px-5 py-5 text-center text-xs text-ink/50">
        © {new Date().getFullYear()} RanCel DataHub. All rights reserved.
      </div>
    </footer>
  );
}
