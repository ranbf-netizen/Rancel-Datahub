import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="mx-auto grid max-w-5xl gap-10 px-5 py-12 sm:py-16 md:grid-cols-2 md:items-center md:py-20">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-clay">
            MTN · Telecel · AirtelTigo · Results Checkers
          </p>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Data bundles and exam results, sorted in one place.
          </h1>
          <p className="mt-4 text-ink/70">
            Buy affordable data for any network and grab your WAEC or BECE results
            checker PIN — pay once per order, no account balance to top up and forget.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/data" className="btn-primary">Buy Data</Link>
            <Link href="/results" className="btn-secondary">Get a Results PIN</Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            {["MTN", "Telecel", "AirtelTigo", "Results Checkers"].map((n) => (
              <span
                key={n}
                className="rounded-full border border-ink/10 bg-white px-4 py-1.5 text-xs font-semibold text-ink/70"
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Signature illustration: a phone receiving a data bundle + a results PIN card */}
        <div className="relative mx-auto w-full max-w-sm">
          <PhoneIllustration />
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-ink/10 bg-white/50">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-2xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <StepCard n="1" title="Pick" desc="Choose your network and bundle, or your exam type and year." />
            <StepCard n="2" title="Pay" desc="Checkout securely with mobile money or card via Paystack." />
            <StepCard n="3" title="Receive" desc="Data lands on the number you entered; PINs are shown instantly." />
          </div>
        </div>
      </section>

      {/* Product highlight cards */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            href="/data"
            className="group card flex items-center justify-between overflow-hidden transition hover:-translate-y-1 hover:shadow-md"
          >
            <div>
              <p className="text-lg font-semibold">Data Bundles</p>
              <p className="mt-1 text-sm text-ink/60">MTN, Telecel & AirtelTigo — less than 10mins delivery.</p>
              <span className="mt-4 inline-block text-sm font-semibold text-moss group-hover:underline">
                Browse bundles →
              </span>
            </div>
            <SignalIcon />
          </Link>

          <Link
            href="/results"
            className="group card flex items-center justify-between overflow-hidden transition hover:-translate-y-1 hover:shadow-md"
          >
            <div>
              <p className="text-lg font-semibold">Results Checker PINs</p>
              <p className="mt-1 text-sm text-ink/60">WAEC & BECE — revealed the moment you pay.</p>
              <span className="mt-4 inline-block text-sm font-semibold text-moss group-hover:underline">
                Get a PIN →
              </span>
            </div>
            <CertificateIcon />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StepCard({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="card">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-moss text-sm font-bold text-paper">
        {n}
      </span>
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-ink/60">{desc}</p>
    </div>
  );
}

function SignalIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="shrink-0 text-moss/80">
      <rect x="8" y="32" width="8" height="16" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="20" y="24" width="8" height="24" rx="2" fill="currentColor" opacity="0.6" />
      <rect x="32" y="14" width="8" height="34" rx="2" fill="currentColor" opacity="0.85" />
      <rect x="44" y="6" width="8" height="42" rx="2" fill="currentColor" />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="shrink-0 text-clay/80">
      <rect x="8" y="8" width="40" height="30" rx="3" fill="currentColor" opacity="0.15" />
      <rect x="8" y="8" width="40" height="30" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M14 18h20M14 24h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="40" cy="40" r="10" fill="currentColor" opacity="0.2" />
      <path d="M36 40l3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIllustration() {
  return (
    <svg viewBox="0 0 320 400" fill="none" className="w-full drop-shadow-xl">
      <rect x="60" y="10" width="200" height="380" rx="28" fill="#101312" />
      <rect x="72" y="30" width="176" height="330" rx="16" fill="#F6F5F1" />
      <rect x="120" y="46" width="80" height="8" rx="4" fill="#101312" opacity="0.15" />

      {/* signal bars */}
      <g transform="translate(96,80)">
        <rect x="0" y="30" width="14" height="26" rx="3" fill="#1F4D3A" opacity="0.4" />
        <rect x="20" y="18" width="14" height="38" rx="3" fill="#1F4D3A" opacity="0.65" />
        <rect x="40" y="4" width="14" height="52" rx="3" fill="#1F4D3A" />
      </g>

      {/* bundle card */}
      <rect x="88" y="160" width="144" height="70" rx="12" fill="#1F4D3A" />
      <text x="160" y="190" textAnchor="middle" fill="#F6F5F1" fontSize="20" fontWeight="700" fontFamily="Inter, sans-serif">
        5GB
      </text>
      <text x="160" y="210" textAnchor="middle" fill="#F6F5F1" fontSize="10" opacity="0.8" fontFamily="Inter, sans-serif">
        MTN · Delivered
      </text>

      {/* PIN card */}
      <rect x="88" y="248" width="144" height="60" rx="12" fill="#B4552F" opacity="0.15" />
      <rect x="88" y="248" width="144" height="60" rx="12" stroke="#B4552F" strokeWidth="2" />
      <text x="160" y="272" textAnchor="middle" fill="#B4552F" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">
        WAEC PIN
      </text>
      <text x="160" y="290" textAnchor="middle" fill="#101312" fontSize="10" opacity="0.7" fontFamily="monospace">
        4829-1938-2039
      </text>

      {/* floating accent dots */}
      <circle cx="40" cy="60" r="6" fill="#B4552F" opacity="0.6" />
      <circle cx="285" cy="120" r="4" fill="#1F4D3A" opacity="0.5" />
      <circle cx="20" cy="300" r="5" fill="#1F4D3A" opacity="0.4" />
    </svg>
  );
}
