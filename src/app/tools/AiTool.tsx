"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Copy, Check } from "lucide-react";

export type Field =
  | { name: string; label: string; type?: "text" | "textarea"; placeholder?: string; rows?: number }
  | { name: string; label: string; type: "select"; options: string[] };

// Generic AI tool: renders a titled form from `fields`, POSTs to `endpoint`,
// and shows the formatted result with a Copy button. Matches the site styling
// (card, field, label, btn-primary).
export default function AiTool({
  title,
  description,
  endpoint,
  fields,
  buttonLabel = "Generate",
}: {
  title: string;
  description: string;
  endpoint: string;
  fields: Field[];
  buttonLabel?: string;
}) {
  const initial: Record<string, string> = {};
  fields.forEach((f) => {
    initial[f.name] = f.type === "select" ? (f as any).options[0] : "";
  });

  const [form, setForm] = useState<Record<string, string>>(initial);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [gate, setGate] = useState<null | "AUTH" | "NO_CREDITS">(null);
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
  const [buying, setBuying] = useState(false);

  async function buyCredits() {
    setBuying(true);
    try {
      const res = await fetch("/api/ai-credits/buy", { method: "POST" });
      const data = await res.json();
      if (data.authorizationUrl) { window.location.href = data.authorizationUrl; return; }
    } catch {}
    setBuying(false);
  }

  function update(name: string, value: string) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function generate() {
    setError("");
    setResult("");
    setCopied(false);
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.status === 401 || data.error === "AUTH") {
        setGate("AUTH");
      } else if (res.status === 402 || data.error === "NO_CREDITS") {
        setGate("NO_CREDITS");
      } else if (!res.ok) {
        setError(data.error || "Something went wrong.");
      } else {
        setResult(data.result);
        if (typeof data.creditsLeft === "number") setCreditsLeft(data.creditsLeft);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  function copy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function render(text: string) {
    return text.split("\n").map((line, i) => {
      const t = line.trim();
      if (!t || /^[-=]{3,}$/.test(t)) return <div key={i} className="h-2" />;
      if (/^#{1,6}\s+/.test(t))
        return <h3 key={i} className="mt-3 mb-1 font-semibold text-ink">{t.replace(/^#{1,6}\s+/, "")}</h3>;
      const html = t
        .replace(/^\*\s+/, "• ")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
      return <p key={i} className="text-sm leading-relaxed text-ink/80" dangerouslySetInnerHTML={{ __html: html }} />;
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <Link href="/tools" className="text-sm text-primary hover:underline">← All AI tools</Link>
      <h1 className="mt-2 text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-slate">{description}</p>
      {creditsLeft !== null && (
        <p className="mt-2 inline-block rounded-full bg-mist px-3 py-1 text-xs font-medium text-ink/70">
          {creditsLeft} credit{creditsLeft === 1 ? "" : "s"} left
        </p>
      )}

      {/* Sign-up gate for guests */}
      {gate === "AUTH" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-5" onClick={() => setGate(null)}>
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-sm text-center">
            <h2 className="text-lg font-bold">Create a free account</h2>
            <p className="mt-2 text-sm text-slate">
              Sign up to use RanCel&rsquo;s AI tools — you get <span className="font-semibold text-ink">5 free credits</span> to start.
              Generate CVs, adverts, captions and more in seconds.
            </p>
            <a href="/register" className="btn-primary mt-4 block">Sign up free</a>
            <a href="/login" className="mt-2 block text-sm text-primary hover:underline">I already have an account</a>
          </div>
        </div>
      )}

      {/* Buy-credits gate when out */}
      {gate === "NO_CREDITS" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-5" onClick={() => setGate(null)}>
          <div onClick={(e) => e.stopPropagation()} className="card w-full max-w-sm text-center">
            <h2 className="text-lg font-bold">You&rsquo;re out of credits</h2>
            <p className="mt-2 text-sm text-slate">
              Get <span className="font-semibold text-ink">10 more credits for GH₵ 5</span> and keep generating.
            </p>
            <button onClick={buyCredits} disabled={buying} className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2">
              {buying && <Loader2 size={16} className="animate-spin" />}
              {buying ? "Starting…" : "Buy 10 credits — GH₵ 5"}
            </button>
          </div>
        </div>
      )}

      <div className="card mt-6 space-y-4">
        {fields.map((f) => (
          <div key={f.name}>
            <label className="label">{f.label}</label>
            {f.type === "textarea" ? (
              <textarea className="field" rows={(f as any).rows || 3} placeholder={(f as any).placeholder || ""} value={form[f.name]} onChange={(e) => update(f.name, e.target.value)} />
            ) : f.type === "select" ? (
              <select className="field" value={form[f.name]} onChange={(e) => update(f.name, e.target.value)}>
                {(f as any).options.map((o: string) => <option key={o}>{o}</option>)}
              </select>
            ) : (
              <input className="field" placeholder={(f as any).placeholder || ""} value={form[f.name]} onChange={(e) => update(f.name, e.target.value)} />
            )}
          </div>
        ))}

        {error && <p className="text-sm text-ghRed">{error}</p>}

        <button onClick={generate} disabled={loading} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Generating…" : buttonLabel}
        </button>
      </div>

      {result && (
        <div className="card mt-6">
          <div className="space-y-1">{render(result)}</div>
          <button onClick={copy} className="btn-secondary mt-4 inline-flex items-center gap-2 !py-1.5 !text-sm">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
