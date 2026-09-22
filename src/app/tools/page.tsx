import Link from "next/link";
import CreditsBar from "../components/CreditsBar";
import { FileText, MessageSquare, Sparkles, Hash, Building2, Package, FileSignature } from "lucide-react";

const TOOLS = [
  { href: "/tools/cv", title: "AI CV Assistant", desc: "Generate a professional CV in seconds.", icon: FileText },
  { href: "/tools/advert", title: "WhatsApp Advert Generator", desc: "A ready-to-post advert from a product + price.", icon: MessageSquare },
  { href: "/tools/business-name", title: "Business Name Generator", desc: "Catchy, brandable name ideas.", icon: Sparkles },
  { href: "/tools/caption", title: "Caption Generator", desc: "Social captions with emojis and hashtags.", icon: Hash },
  { href: "/tools/business-description", title: "Business Description", desc: "A polished description for your bio.", icon: Building2 },
  { href: "/tools/product-description", title: "Product Description", desc: "Copy that makes products sell.", icon: Package },
  { href: "/tools/proposal", title: "Proposal Generator", desc: "Professional proposals in seconds.", icon: FileSignature },
];

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">AI Tools</p>
      <h1 className="mt-1 text-3xl font-bold">Free AI Business Tools</h1>
      <p className="mt-2 text-slate">Smart tools to help you sell more and work faster — powered by AI.</p>

      <CreditsBar />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {TOOLS.map((t, i) => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} className={`card hover-lift animate-fade-rise stagger-${(i % 5) + 1} flex items-start gap-3`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={20} />
              </span>
              <span>
                <span className="block font-semibold text-ink">{t.title}</span>
                <span className="mt-0.5 block text-sm text-slate">{t.desc}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
