import Link from "next/link";
import { Zap, ShieldCheck, Smartphone, MessageCircle, GraduationCap, Sparkles, Download, Users, Sprout } from "lucide-react";
import QuickBuyWidget from "./components/QuickBuyWidget";
import UnsupportedSimNotice from "./components/UnsupportedSimNotice";
import FAQAccordion from "./components/FAQAccordion";
import ScrollFade from "./components/ScrollFade";
import NetworkIllustration from "./components/NetworkIllustration";
import LiveDeliveryAnimation from "./components/LiveDeliveryAnimation";
import TestimonialSlider from "./components/TestimonialSlider";

export default function HomePage() {
  return (
    <div>
      {/* Hero - background image with dark overlay for readability */}
      <section className="relative bg-ink">
        {/* background image + overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-ink/90 via-ink/80 to-ink/70" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:items-center md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-mtn" /> Ghana&rsquo;s all-in-one digital platform
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] text-white sm:text-5xl">
              Ghana&rsquo;s Digital<br />Services Hub
            </h1>
            <p className="mt-5 max-w-md text-white/70">
              Buy data bundles, access digital subscriptions, discover AI-powered tools, download
              digital products, and grow your business — all from one platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/data" className="btn-primary">Buy Data Now</Link>
              <Link href="/shop" className="btn-primary">Shop Now</Link>
              <Link href="/tools" className="btn-ghost-light">Try AI Tools</Link>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/10 pt-6">
              <Stat value="Instant" label="Delivery" />
              <Stat value="5+" label="Services in one place" />
              <Stat value="24/7" label="Always open" />
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

      {/* Everything in one place - services grid */}
      <ScrollFade>
        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">One platform, many services</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Everything you need, in one place</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ServiceCard icon={<Zap size={20} />} title="Data Bundles" desc="Affordable data for MTN, Telecel & AirtelTigo — delivered instantly." href="/data" />
            <ServiceCard icon={<GraduationCap size={20} />} title="Results Checkers" desc="WAEC & BECE checker vouchers, ready in seconds." href="/results" />
            <ServiceCard icon={<Sparkles size={20} />} title="AI Tools" desc="Generate CVs, adverts, captions & more with AI." href="/tools" />
            <ServiceCard icon={<Download size={20} />} title="Digital Products" desc="Templates, guides & resources — instant download." href="/shop" />
            <ServiceCard icon={<Users size={20} />} title="Agent Program" desc="Resell and earn with your own store link." href="/agents" />
            <ServiceCard icon={<Sprout size={20} />} title="AFA Registration" desc="Register quickly and track your status." href="/afa" />
          </div>
        </section>
      </ScrollFade>

      {/* Digital Shop CTA */}
      <ScrollFade>
        <section className="mx-auto max-w-6xl px-5 py-6">
          <div className="overflow-hidden rounded-2xl bg-primary px-6 py-10 text-center sm:px-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Digital Shop</p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Digital products & social media boosting</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">
              Grab templates, guides and resources with instant delivery — and grow your reach with
              Instagram, TikTok, YouTube and more boosting services.
            </p>
            <Link href="/shop" className="mt-6 inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary transition hover:bg-white/90">
              Explore Digital Services
            </Link>
          </div>
        </section>
      </ScrollFade>

      {/* AI Tools showcase */}
      <ScrollFade>
        <section className="bg-ink py-16">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-mtn">AI-Powered</p>
              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Smart tools to grow your business</h2>
              <p className="mt-3 max-w-md text-white/60">
                Write a professional CV, a WhatsApp advert, social captions, product descriptions and
                more — in seconds. Start with <span className="font-semibold text-white">5 free credits</span>.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["CV Assistant", "WhatsApp Advert", "Captions", "Business Names", "Proposals"].map((t) => (
                  <span key={t} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/80">{t}</span>
                ))}
              </div>
              <Link href="/tools" className="btn-primary mt-7 inline-flex">Explore AI Tools</Link>
            </div>
            {/* AI tools hero image */}
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <img src="/ai-tools-hero.jpg" alt="AI-powered tools" className="aspect-[4/3] w-full object-cover" />
            </div>
          </div>
        </section>
      </ScrollFade>

      {/* Testimonials — PLACEHOLDER quotes, replace with real customer feedback before launch */}
      <ScrollFade>
        <section className="mx-auto max-w-6xl px-5 py-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">What customers say</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Trusted by people across Ghana</h2>
          {/* TODO: replace the placeholder quotes/names below with real testimonials; add photoUrl for real photos */}
          <TestimonialSlider
            items={[
                            { quote: "Fast and reliable service. My data bundle was delivered within minutes and the process was very smooth.", name: "Kwame Mensah", location: "Accra" },
              { quote: "I use Rancel DataHub regularly for data purchases. The platform is simple, affordable, and easy to use.", name: "Ama Serwaa", location: "Kumasi" },
              { quote: "The results checker purchase was quick and hassle-free. I received my voucher instantly after payment.", name: "Daniel Owusu", location: "Takoradi" },
              { quote: "What I like most is the convenience. I can access digital services anytime without stress.", name: "Abena Asante", location: "Cape Coast" },
            ]}
          />
        
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

      {/* Live delivery animation - interactive, loops continuously */}
      <ScrollFade>
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <LiveDeliveryAnimation />
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

            <Link
            href="/tools"
            className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-lg font-semibold">AI Tools</p>
            <p className="mt-1 text-sm text-slate">Powerful AI tools to enhance and boost work productivity.</p>
            <span className="mt-4 inline-block text-sm font-semibold text-primary group-hover:underline">
              Try it out →
            </span>
          </Link>

          <Link
            href="/shop"
            className="group relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <p className="text-lg font-semibold">Digital Products</p>
            <p className="mt-1 text-sm text-slate">Apple One, Netflix, SnapChat Plus, SnapChat Upgrade, etc. — instant delivery and manual fulfilments.</p>
            <span className="mt-4 inline-block text-sm font-semibold text-primary group-hover:underline">
              Browse products →
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

function ServiceCard({ icon, title, desc, href }: { icon: React.ReactNode; title: string; desc: string; href: string }) {
  return (
    <Link href={href} className="card hover-lift flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
      <span>
        <span className="block font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-slate">{desc}</span>
      </span>
    </Link>
  );
}

