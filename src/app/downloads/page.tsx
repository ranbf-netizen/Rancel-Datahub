"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Download, ExternalLink, Mail, MailOpen, CheckCircle2, Copy, Check, Clock } from "lucide-react";

function CountdownRing({ secondsLeft, totalSeconds }: { secondsLeft: number; totalSeconds: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const fraction = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
  const offset = circumference * (1 - fraction);
  const color = fraction > 0.5 ? "#006B3F" : fraction > 0.2 ? "#FFCC08" : "#CE1126";

  return (
    <div className="relative inline-flex h-16 w-16 items-center justify-center">
      <svg viewBox="0 0 60 60" className="h-16 w-16 -rotate-90">
        <circle cx="30" cy="30" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="5" />
        <circle
          cx="30" cy="30" r={radius} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
      </svg>
      <span className="absolute text-sm font-bold text-ink">{secondsLeft}</span>
    </div>
  );
}

function DownloadInner() {
  const params = useSearchParams();
  const ref = params.get("ref");
  const [state, setState] = useState<"loading" | "paid" | "pending" | "error">("loading");
  const [item, setItem] = useState<{ title: string; fileUrl: string; deliveryType: string; revealContent: string | null; secondsRemaining?: number; expired?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number>(60);

  async function check() {
    if (!ref) { setState("error"); return; }
    const res = await fetch(`/api/digital-products/download?ref=${ref}`);
    const data = await res.json();
    if (data.status === "paid") {
      setItem(data);
      setState("paid");
      if (data.deliveryType === "GMAIL_LATEST" && !data.expired && typeof data.secondsRemaining === "number") {
        setSecondsLeft(data.secondsRemaining);
        setTotalSeconds(data.secondsRemaining);
      }
    }
    else if (data.status === "pending") setState("pending");
    else setState("error");
  }

  useEffect(() => { check(); }, [ref]);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setItem((prev) => (prev ? { ...prev, revealContent: null, expired: true } : prev));
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      {state === "loading" && <p className="inline-flex items-center gap-2 text-slate"><Loader2 size={18} className="animate-spin" /> Checking your payment…</p>}

      {state === "pending" && (
        <>
          <Loader2 size={32} className="mx-auto animate-spin text-primary" />
          <h1 className="mt-4 text-xl font-bold">Confirming payment…</h1>
          <p className="mt-2 text-sm text-slate">This can take a few seconds. Click below to refresh.</p>
          <button onClick={check} className="btn-primary mt-4">Refresh</button>
        </>
      )}

      {state === "paid" && item && (
        <>
          <CheckCircle2 size={40} className="mx-auto text-primary" />
          <h1 className="mt-4 text-xl font-bold">Payment confirmed!</h1>
          <p className="mt-1 text-slate">Your purchase: <span className="font-semibold text-ink">{item.title}</span></p>

          {item.deliveryType === "REVEAL" ? (
            <div className="mt-5 text-left">
              <p className="label">Your details</p>
              <div className="mt-1 whitespace-pre-wrap rounded-lg bg-mist p-4 font-mono text-sm text-ink">{item.revealContent}</div>
              <button
                onClick={() => { navigator.clipboard.writeText(item.revealContent || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="btn-primary mt-3 inline-flex items-center gap-2"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : item.deliveryType === "GMAIL_LATEST" ? (
            <div className="mt-5 text-left">
              {!item.expired && item.revealContent ? (
                <div className="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-ink/5 bg-gradient-to-r from-primary/5 to-transparent px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                      <MailOpen size={16} className="text-primary" /> Your instructions
                    </span>
                    {secondsLeft !== null && <CountdownRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} />}
                  </div>
                  <div className="whitespace-pre-wrap px-4 py-4 font-mono text-sm leading-relaxed text-ink">
                    {item.revealContent}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-ink/5 bg-mist/60 px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate">
                      <Clock size={12} /> {secondsLeft !== null && secondsLeft <= 10 ? "Closing fast — grab this now" : "This view closes automatically"}
                    </span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(item.revealContent || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-mist"
                    >
                      {copied ? <Check size={13} className="text-ghGreen" /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-ink/10 bg-mist/60 px-4 py-8 text-center">
                  <Mail size={28} className="text-slate" />
                  <p className="text-sm font-semibold text-ink">This reveal window has closed</p>
                  <p className="text-xs text-slate">Contact support if you didn&rsquo;t get a chance to read it.</p>
                </div>
              )}
            </div>
          ) : item.deliveryType === "MANUAL" ? (
            <div className="mt-5 rounded-lg bg-mist p-4 text-sm text-ink/80">
              We&rsquo;ll contact you to fulfil this.
            </div>
          ) : (
            <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5 inline-flex items-center gap-2">
              {item.deliveryType === "LINK" ? <><ExternalLink size={16} /> Open Link</> : <><Download size={16} /> Download Now</>}
            </a>
          )}
        </>
      )}

      {state === "error" && <h1 className="text-xl font-bold">We couldn&rsquo;t find that purchase.</h1>}
    </div>
  );
}

export default function DownloadsPage() {
  return <Suspense fallback={null}><DownloadInner /></Suspense>;
}