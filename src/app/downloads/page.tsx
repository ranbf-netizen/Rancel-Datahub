"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Download,
  ExternalLink,
  Mail,
  MailOpen,
  CheckCircle2,
  Copy,
  Check,
  Clock,
  ClipboardList,
  TriangleAlert,
  RotateCcw,
} from "lucide-react";

// Visual countdown only.
// The server remains authoritative about whether the reveal is still valid.
function CountdownRing({
  secondsLeft,
  totalSeconds,
}: {
  secondsLeft: number;
  totalSeconds: number;
}) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  const fraction =
    totalSeconds > 0
      ? Math.min(1, Math.max(0, secondsLeft / totalSeconds))
      : 0;

  const offset = circumference * (1 - fraction);

  const color =
    fraction > 0.5
      ? "#006B3F"
      : fraction > 0.2
        ? "#FFCC08"
        : "#CE1126";

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
  const [errorMessage, setErrorMessage] = useState("");

  const [item, setItem] = useState<{
    title: string;
    fileUrl: string;
    deliveryType: string;
    revealContent: string | null;
    gmailAddress?: string | null;
    revealInstruction?: string | null;
    secondsRemaining?: number;
    totalSeconds?: number;
    secondsWaited?: number;
    maxWaitSeconds?: number;
    attemptsRemaining?: number;
    phase?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number>(60);

  // Core fetch used everywhere: initial load, the first "start checking"
  // click, every poll while waiting, and retries.
  async function loadPurchase(opts?: { checkCode?: boolean; retry?: boolean }) {
    if (!ref) {
      setErrorMessage("Missing purchase reference.");
      setState("error");
      return;
    }

    try {
      const query = new URLSearchParams({ ref });
      if (opts?.checkCode) query.set("checkCode", "1");
      if (opts?.retry) query.set("retry", "1");

      const res = await fetch(`/api/digital-products/download?${query.toString()}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data?.error || "Something went wrong while loading your purchase.");
        setState("error");
        return;
      }

      if (data.status === "paid") {
        setItem(data);
        setState("paid");

        if (data.deliveryType === "GMAIL_LATEST" && data.phase === "revealed" && typeof data.secondsRemaining === "number") {
          setSecondsLeft(data.secondsRemaining);
          setTotalSeconds(typeof data.totalSeconds === "number" ? data.totalSeconds : 60);
        } else {
          setSecondsLeft(null);
        }

        // If we loaded the page and a check is already in progress (e.g. the
        // buyer refreshed mid-wait), pick the polling back up automatically
        // instead of making them click the button again.
        if (data.deliveryType === "GMAIL_LATEST" && data.phase === "checking") {
          loadPurchase({ checkCode: true });
        }
        return;
      }

      if (data.status === "pending") {
        setState("pending");
        return;
      }

      setErrorMessage(data?.error || "Something went wrong while loading your purchase.");
      setState("error");
    } catch (error) {
      console.error("DOWNLOAD PAGE ERROR:", error);
      setErrorMessage("We couldn't load your purchase. Please try again.");
      setState("error");
    }
  }

  useEffect(() => {
    loadPurchase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  // Buyer clicks "Start check" - this claims the cutoff FIRST. They should
  // only go request the actual code AFTER this succeeds, so anything that
  // arrives counts as "new".
  async function startCheck() {
    if (!ref || checkingCode) return;
    setCheckingCode(true);
    setCopied(false);
    await loadPurchase({ checkCode: true });
    setCheckingCode(false);
  }

  async function retryCheck() {
    if (!ref || checkingCode) return;
    setCheckingCode(true);
    setCopied(false);
    await loadPurchase({ checkCode: true, retry: true });
    setCheckingCode(false);
  }

  // Keep polling automatically every few seconds while we're waiting on a
  // fresh email to arrive. Stops the moment the phase changes to anything
  // else (revealed, not_found, not_found_final, expired).
  useEffect(() => {
    if (item?.deliveryType !== "GMAIL_LATEST") return;
    if (item?.phase !== "waiting") return;
    const t = setInterval(() => loadPurchase({ checkCode: true }), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.phase]);

  // Visual countdown for the revealed code. The server remains authoritative.
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      setItem((prev) => (prev ? { ...prev, revealContent: null, revealInstruction: null, phase: "expired" } : prev));
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((current) => (current !== null ? Math.max(0, current - 1) : current)), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function copyContent() {
    if (!item?.revealContent) return;
    try {
      await navigator.clipboard.writeText(item.revealContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      {state === "loading" && (
        <p className="inline-flex items-center gap-2 text-slate">
          <Loader2 size={18} className="animate-spin" /> Checking your payment…
        </p>
      )}

      {state === "pending" && (
        <>
          <Loader2 size={32} className="mx-auto animate-spin text-primary" />
          <h1 className="mt-4 text-xl font-bold">Confirming payment…</h1>
          <p className="mt-2 text-sm text-slate">This can take a few seconds. Click below to refresh.</p>
          <button onClick={() => loadPurchase()} className="btn-primary mt-4">Refresh</button>
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
              <button onClick={copyContent} className="btn-primary mt-3 inline-flex items-center gap-2">
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : item.deliveryType === "GMAIL_LATEST" ? (
            <div className="mt-5 text-left">
              {/* READY / FIRST VISIT - start the check BEFORE requesting the code */}
              {(item.phase === "ready" || !item.phase) && (
                <div className="rounded-2xl border border-ink/10 bg-mist/60 p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-2"><Mail size={18} className="text-primary" /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">Use this Gmail to sign in</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate">Use the Gmail below when signing in and request the verification code.</p>
                      <p className="mt-2 break-all text-sm font-bold text-ink">{item.gmailAddress || "Gmail address not configured"}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-ghRed/20 bg-ghRed/5 p-4">
                    <div className="flex items-start gap-3">
                      <TriangleAlert size={19} className="mt-0.5 shrink-0 text-ghRed" />
                      <div>
                        <p className="text-sm font-bold text-ghRed">IMPORTANT — order matters</p>
                        <p className="mt-1 text-sm leading-relaxed text-ink">
                          Tap <span className="font-bold">&ldquo;Start check&rdquo;</span> below <span className="font-bold">FIRST</span>.
                          Only after that, go request your Netflix sign-in code.
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate">
                          Requesting the code before starting the check means we&rsquo;ll miss it — we only look for codes that arrive after you start.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={startCheck}
                    disabled={checkingCode || !item.gmailAddress}
                    className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkingCode ? <Loader2 size={16} className="animate-spin" /> : <MailOpen size={16} />}
                    {checkingCode ? "Starting…" : "Start check — then request your code"}
                  </button>
                </div>
              )}

              {/* WAITING - the check has started, now tell them to go request it */}
              {item.phase === "waiting" && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
                  <Loader2 size={26} className="mx-auto animate-spin text-primary" />
                  <p className="mt-3 text-sm font-semibold text-ink">Now go request your sign-in code</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate">
                    Tap &ldquo;Send code&rdquo; on the sign-in screen with <span className="font-semibold text-ink">{item.gmailAddress}</span>.
                    We&rsquo;re checking automatically every few seconds.
                  </p>
                  {typeof item.secondsWaited === "number" && typeof item.maxWaitSeconds === "number" && (
                    <p className="mt-3 text-xs text-slate">Waited {item.secondsWaited}s of {item.maxWaitSeconds}s</p>
                  )}
                </div>
              )}

              {/* CODE FOUND */}
              {item.phase === "revealed" && item.revealContent && (
                <div className="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-ink/5 bg-gradient-to-r from-primary/5 to-transparent px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink"><MailOpen size={16} className="text-primary" /> Verification code</span>
                    {secondsLeft !== null && <CountdownRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} />}
                  </div>
                  <div className="px-4 py-5 text-center">
                    {item.revealInstruction && <p className="mb-3 text-sm leading-relaxed text-slate">{item.revealInstruction}</p>}
                    <div className="rounded-xl bg-mist px-4 py-5">
                      <p className="font-mono text-3xl font-bold tracking-[0.2em] text-ink">{item.revealContent}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-ink/5 bg-mist/60 px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate">
                      <Clock size={12} />
                      {secondsLeft !== null && secondsLeft <= 10 ? "Closing fast — grab this now" : "This code will disappear automatically"}
                    </span>
                    <button onClick={copyContent} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-mist">
                      {copied ? <Check size={13} className="text-ghGreen" /> : <Copy size={13} />} {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {/* CODE NOT FOUND - retry still available */}
              {item.phase === "not_found" && (
                <div className="rounded-2xl border border-ghRed/20 bg-ghRed/5 p-5">
                  <div className="flex items-start gap-3">
                    <TriangleAlert size={20} className="mt-0.5 shrink-0 text-ghRed" />
                    <div>
                      <p className="text-sm font-bold text-ghRed">No code arrived in time</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate">
                        Make sure you actually requested the code with {item.gmailAddress || "the Gmail above"} after starting the check.
                      </p>
                      {typeof item.attemptsRemaining === "number" && (
                        <p className="mt-2 text-xs leading-relaxed text-slate">{item.attemptsRemaining} attempt{item.attemptsRemaining === 1 ? "" : "s"} remaining.</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={retryCheck}
                    disabled={checkingCode}
                    className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {checkingCode ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                    {checkingCode ? "Retrying…" : "Try again"}
                  </button>
                </div>
              )}

              {/* NOT FOUND, OUT OF ATTEMPTS - terminal */}
              {item.phase === "not_found_final" && (
                <div className="rounded-2xl border border-ghRed/20 bg-ghRed/5 p-5">
                  <div className="flex items-start gap-3">
                    <TriangleAlert size={20} className="mt-0.5 shrink-0 text-ghRed" />
                    <div>
                      <p className="text-sm font-bold text-ghRed">Code could not be retrieved</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate">All available checks for this purchase have been used.</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate">Please contact support with your payment reference so the order can be checked.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* EXPIRED */}
              {item.phase === "expired" && (
                <div className="rounded-2xl border border-ink/10 bg-mist/60 p-5">
                  <div className="flex items-start gap-3">
                    <Clock size={20} className="mt-0.5 shrink-0 text-slate" />
                    <div>
                      <p className="text-sm font-semibold text-ink">Code display expired</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate">The verification code is no longer displayed. This purchase has already used its code check.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {["MANUAL", "MANUAL_FULFILMENT", "MANUAL_FULFILLMENT"].includes(item.deliveryType) ? (
                <div className="mt-5 rounded-2xl border border-ink/10 bg-mist/60 px-5 py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10"><ClipboardList size={24} className="text-primary" /></div>
                  <h2 className="mt-4 text-base font-semibold text-ink">Order received</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate">Your payment was successful. This product requires manual fulfilment, so we&rsquo;ll process your order and provide the delivery details separately.</p>
                  <p className="mt-4 text-xs leading-relaxed text-slate">Please keep your payment reference and check your contact details for updates.</p>
                </div>
              ) : item.deliveryType === "LINK" ? (
                <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5 inline-flex items-center gap-2"><ExternalLink size={16} /> Open Link</a>
              ) : (
                <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5 inline-flex items-center gap-2"><Download size={16} /> Download Now</a>
              )}
            </>
          )}
        </>
      )}

      {state === "error" && (
        <>
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate">{errorMessage || "We couldn't load your purchase."}</p>
          <button onClick={() => loadPurchase()} className="btn-primary mt-4">Try again</button>
        </>
      )}
    </div>
  );
}

export default function DownloadsPage() {
  return (
    <Suspense fallback={null}>
      <DownloadInner />
    </Suspense>
  );
}
