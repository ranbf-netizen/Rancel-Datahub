import Link from "next/link";
import { Zap, ShieldCheck, Smartphone, MessageCircle } from "lucide-react";
import QuickBuyWidget from "./components/QuickBuyWidget";
import UnsupportedSimNotice from "./components/UnsupportedSimNotice";
import FAQAccordion from "./components/FAQAccordion";
import ScrollFade from "./components/ScrollFade";
import NetworkIllustration from "./components/NetworkIllustration";

export default function HomePage() {
  return (
    <div>
      {/* Hero - solid, no gradients/glow */}
      <section className="bg-ink">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-mtn" /> MTN · Telecel · AirtelTigo
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] text-white sm:text-5xl">
              Stay Connected.<br />Spend Less.
            </h1>
            <p className="mt-5 max-w-md text-white/60">
              Buy affordable data bundles for any network in Ghana. Fast checkout, secure
              payments, and reliable delivery — every time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/data" className="btn-primary">Buy Data Now</Link>
              <Link href="/agents" className="btn-ghost-light">Become an Agent</Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
              <Stat value="Instant" label="Delivery" />
              <Stat value="3" label="Networks supported" />
              <Stat value="24/7" label="Ordering" />
            </div>
          </div>

          <QuickBuyWidget />
        </div>
      </section>

      {/* Network illustration strip - a real visual, not stock photography */}
      <ScrollFade>
        <section className="border-b border-ink/10 bg-mist py-10">
          <div className="mx-auto max-w-6xl px-5">
            <NetworkIllustration />
          </div>
        </section>
      </ScrollFade>

      {/* How it works */}
      <ScrollFade>
        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">How it works</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Four steps. That's it.</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StepCard n="01" title="Choose your network" desc="MTN, Telecel, or AirtelTigo." />
            <StepCard n="02" title="Pick your bundle" desc="From 1GB to 50GB, priced fairly." />
            <StepCard n="03" title="Enter your number & pay" desc="Secure checkout, seconds to complete." />
            <StepCard n="04" title="Receive your data" desc="Delivered straight to the SIM." />
          </div>
        </section>
      </ScrollFade>

      {/* Trust section - professional icons, no emoji */}
      <section className="border-y border-ink/10 bg-mist">
        <ScrollFade>
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className="text-2xl font-bold sm:text-3xl">Why RanCel DataHub</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <TrustCard icon={Zap} title="Fast Delivery" desc="Get your data without unnecessary steps." />
              <TrustCard icon={ShieldCheck} title="Secure Payments" desc="Handled through secure payment infrastructure." />
              <TrustCard icon={Smartphone} title="All Major Networks" desc="MTN, Telecel and AirtelTigo." />
              <TrustCard icon={MessageCircle} title="Customer Support" desc="Get help via WhatsApp when you need it." />
            </div>
          </div>
        </ScrollFade>
      </section>

      {/* Results checker cross-sell */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            href="/data"
            className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-lg font-semibold">Data Bundles</p>
            <p className="mt-1 text-sm text-slate">MTN, Telecel & AirtelTigo — instant delivery.</p>
            <span className="mt-4 inline-block text-sm font-semibold text-primary group-hover:underline">
              Browse bundles →
            </span>
          </Link>
          <Link
            href="/results"
            className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-lg font-semibold">Results Checker PINs</p>
            <p className="mt-1 text-sm text-slate">WAEC & BECE — revealed the moment you pay.</p>
            <span className="mt-4 inline-block text-sm font-semibold text-primary group-hover:underline">
              Get a PIN →
            </span>
          </Link>
        </div>

        <div className="mt-8">
          <UnsupportedSimNotice />
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-ink/10 bg-mist">
        <ScrollFade>
          <div className="mx-auto max-w-2xl px-5 py-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">FAQ</p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Frequently asked questions</h2>
            <div className="mt-6">
              <FAQAccordion />
            </div>
          </div>
        </ScrollFade>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}

function StepCard({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="card">
      <p className="font-display text-2xl font-bold text-primary/30">{n}</p>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-slate">{desc}</p>
    </div>
  );
}

function TrustCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-white p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={20} />
      </div>
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-slate">{desc}</p>
    </div>
  );
}
