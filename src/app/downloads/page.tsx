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
  Send,
  ClipboardList,
} from "lucide-react";

// Circular countdown ring for the timed Gmail reveal.
// This is visual only. The server remains authoritative.
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
        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          stroke="#F1F5F9"
          strokeWidth="5"
        />

        <circle
          cx="30"
          cy="30"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition:
              "stroke-dashoffset 1s linear, stroke 0.3s",
          }}
        />
      </svg>

      <span className="absolute text-sm font-bold text-ink">
        {secondsLeft}
      </span>
    </div>
  );
}

function DownloadInner() {
  const params = useSearchParams();
  const ref = params.get("ref");

  const [state, setState] = useState<
    "loading" | "paid" | "pending" | "error"
  >("loading");

  const [item, setItem] = useState<{
    title: string;
    fileUrl: string;
    deliveryType: string;
    revealContent: string | null;

    // Gmail-specific fields
    gmailAddress?: string | null;
    secondsRemaining?: number;
    totalSeconds?: number;
    expired?: boolean;
    phase?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number>(60);

  const [confirmChecked, setConfirmChecked] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /**
   * Check the current delivery status.
   */
  async function check() {
    if (!ref) {
      setState("error");
      return;
    }

    try {
      const res = await fetch(
        `/api/digital-products/download?ref=${encodeURIComponent(ref)}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (data.status === "paid") {
        setItem(data);
        setState("paid");

        /**
         * When the Gmail email has been revealed,
         * initialise the visual countdown.
         */
        if (
          data.deliveryType === "GMAIL_LATEST" &&
          data.phase === "revealed" &&
          typeof data.secondsRemaining === "number"
        ) {
          setSecondsLeft(data.secondsRemaining);

          setTotalSeconds(
            typeof data.totalSeconds === "number"
              ? data.totalSeconds
              : 60
          );
        }

        /**
         * If the server says the reveal has expired,
         * immediately clear the client-side content too.
         */
        if (
          data.deliveryType === "GMAIL_LATEST" &&
          data.phase === "expired"
        ) {
          setSecondsLeft(0);

          setItem((prev) =>
            prev
              ? {
                  ...prev,
                  revealContent: null,
                  expired: true,
                  phase: "expired",
                }
              : prev
          );
        }
      } else if (data.status === "pending") {
        setState("pending");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  /**
   * Initial payment/delivery check.
   */
  useEffect(() => {
    check();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  /**
   * While waiting for a new Gmail message,
   * check automatically every 4 seconds.
   */
  useEffect(() => {
    if (item?.deliveryType !== "GMAIL_LATEST") return;
    if (item?.phase !== "waiting") return;

    const timer = setInterval(() => {
      check();
    }, 4000);

    return () => clearInterval(timer);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.deliveryType, item?.phase]);

  /**
   * Visual countdown.
   *
   * This does NOT determine whether the email is accessible.
   * The server does that.
   */
  useEffect(() => {
    if (secondsLeft === null) return;

    if (secondsLeft <= 0) {
      setItem((prev) =>
        prev
          ? {
              ...prev,
              revealContent: null,
              expired: true,
              phase: "expired",
            }
          : prev
      );

      return;
    }

    const timer = setTimeout(() => {
      setSecondsLeft((current) =>
        current !== null ? Math.max(0, current - 1) : current
      );
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  /**
   * Tell the backend that the customer has requested
   * a new sign-in code.
   */
  async function confirmRequested() {
    if (!ref) return;

    setConfirming(true);

    try {
      const res = await fetch(
        "/api/digital-products/confirm-request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref }),
        }
      );

      if (!res.ok) {
        setState("error");
        return;
      }

      /**
       * Reset the visual state before checking again.
       * This is especially useful when "Try again" is clicked.
       */
      setSecondsLeft(null);
      setConfirmChecked(false);

      await check();
    } catch {
      setState("error");
    } finally {
      setConfirming(false);
    }
  }

  /**
   * Copy revealed Gmail content.
   */
  async function copyContent() {
    if (!item?.revealContent) return;

    try {
      await navigator.clipboard.writeText(item.revealContent);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      {/* Loading */}
      {state === "loading" && (
        <p className="inline-flex items-center gap-2 text-slate">
          <Loader2 size={18} className="animate-spin" />
          Checking your payment…
        </p>
      )}

      {/* Payment pending */}
      {state === "pending" && (
        <>
          <Loader2
            size={32}
            className="mx-auto animate-spin text-primary"
          />

          <h1 className="mt-4 text-xl font-bold">
            Confirming payment…
          </h1>

          <p className="mt-2 text-sm text-slate">
            This can take a few seconds. Click below to refresh.
          </p>

          <button
            onClick={check}
            className="btn-primary mt-4"
          >
            Refresh
          </button>
        </>
      )}

      {/* Paid */}
      {state === "paid" && item && (
        <>
          <CheckCircle2
            size={40}
            className="mx-auto text-primary"
          />

          <h1 className="mt-4 text-xl font-bold">
            Payment confirmed!
          </h1>

          <p className="mt-1 text-slate">
            Your purchase:{" "}
            <span className="font-semibold text-ink">
              {item.title}
            </span>
          </p>

          {/* =========================================
              NORMAL REVEAL PRODUCT
             ========================================= */}
          {item.deliveryType === "REVEAL" ? (
            <div className="mt-5 text-left">
              <p className="label">Your details</p>

              <div className="mt-1 whitespace-pre-wrap rounded-lg bg-mist p-4 font-mono text-sm text-ink">
                {item.revealContent}
              </div>

              <button
                onClick={copyContent}
                className="btn-primary mt-3 inline-flex items-center gap-2"
              >
                {copied ? (
                  <Check size={16} />
                ) : (
                  <Copy size={16} />
                )}

                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          ) : item.deliveryType === "GMAIL_LATEST" ? (
            /* =========================================
               GMAIL LATEST
               ========================================= */
            <div className="mt-5 text-left">
              {/* STEP 1 — ASK CUSTOMER TO CONFIRM */}
              {item.phase === "awaiting_confirmation" && (
                <div className="rounded-2xl border border-ink/10 bg-mist/60 p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                      <Mail
                        size={18}
                        className="text-primary"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Before we check your inbox
                      </p>

                      <p className="mt-1 text-sm leading-relaxed text-slate">
                        Request the sign-in code using this Gmail:
                      </p>

                      <p className="mt-2 break-all text-sm font-bold text-ink">
                        {item.gmailAddress ||
                          "Gmail address not configured"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-slate">
                    Go to the sign-in screen and request your
                    code. Once you&rsquo;ve requested it, confirm
                    below and we&rsquo;ll start checking for the
                    new email.
                  </p>

                  <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={confirmChecked}
                      onChange={(e) =>
                        setConfirmChecked(e.target.checked)
                      }
                    />

                    <span>
                      I&rsquo;ve requested the sign-in code using
                      the Gmail above.
                    </span>
                  </label>

                  <button
                    onClick={confirmRequested}
                    disabled={!confirmChecked || confirming}
                    className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {confirming ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Send size={16} />
                    )}

                    {confirming
                      ? "Checking…"
                      : "I've requested it — show my code"}
                  </button>
                </div>
              )}

              {/* STEP 2 — WAITING FOR NEW EMAIL */}
              {item.phase === "waiting" && (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-ink/10 bg-mist/60 px-4 py-8 text-center">
                  <Loader2
                    size={26}
                    className="animate-spin text-primary"
                  />

                  <p className="text-sm font-semibold text-ink">
                    Waiting for your new code…
                  </p>

                  <p className="text-xs leading-relaxed text-slate">
                    We&rsquo;re checking automatically for the
                    new email you requested.
                  </p>

                  <p className="text-xs text-slate">
                    Please keep this page open.
                  </p>
                </div>
              )}

              {/* STEP 3 — FIVE-MINUTE TIMEOUT */}
              {item.phase === "wait_timed_out" && (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-ghRed/20 bg-ghRed/5 px-4 py-8 text-center">
                  <Mail
                    size={28}
                    className="text-ghRed"
                  />

                  <p className="text-sm font-semibold text-ink">
                    No new code arrived
                  </p>

                  <p className="text-xs leading-relaxed text-slate">
                    We didn&rsquo;t detect a new email within
                    5 minutes. Make sure you requested the
                    sign-in code, then try again.
                  </p>

                  <button
                    onClick={confirmRequested}
                    disabled={confirming}
                    className="btn-primary mt-2 inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {confirming ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Send size={16} />
                    )}

                    {confirming
                      ? "Trying again…"
                      : "Try again"}
                  </button>
                </div>
              )}

              {/* STEP 4 — EMAIL REVEALED */}
              {item.phase === "revealed" && (
                <div className="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-ink/5 bg-gradient-to-r from-primary/5 to-transparent px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                      <MailOpen
                        size={16}
                        className="text-primary"
                      />

                      Your instructions
                    </span>

                    {secondsLeft !== null && (
                      <CountdownRing
                        secondsLeft={secondsLeft}
                        totalSeconds={totalSeconds}
                      />
                    )}
                  </div>

                  <div className="whitespace-pre-wrap px-4 py-4 font-mono text-sm leading-relaxed text-ink">
                    {item.revealContent}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-ink/5 bg-mist/60 px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate">
                      <Clock size={12} />

                      {secondsLeft !== null &&
                      secondsLeft <= 10
                        ? "Closing fast — grab this now"
                        : "This view closes automatically"}
                    </span>

                    <button
                      onClick={copyContent}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink/10 bg-white px-2.5 py-1 text-xs font-medium text-ink hover:bg-mist"
                    >
                      {copied ? (
                        <Check
                          size={13}
                          className="text-ghGreen"
                        />
                      ) : (
                        <Copy size={13} />
                      )}

                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5 — REVEAL EXPIRED */}
              {item.phase === "expired" && (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-ink/10 bg-mist/60 px-4 py-8 text-center">
                  <Mail
                    size={28}
                    className="text-slate"
                  />

                  <p className="text-sm font-semibold text-ink">
                    This reveal window has closed
                  </p>

                  <p className="text-xs leading-relaxed text-slate">
                    Contact support if you didn&rsquo;t get a
                    chance to read the information.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* =========================================
               MANUAL / LINK / DOWNLOAD
               ========================================= */
            <>
              {[
                "MANUAL",
                "MANUAL_FULFILMENT",
                "MANUAL_FULFILLMENT",
              ].includes(item.deliveryType) ? (
                <div className="mt-5 rounded-2xl border border-ink/10 bg-mist/60 px-5 py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <ClipboardList
                      size={24}
                      className="text-primary"
                    />
                  </div>

                  <h2 className="mt-4 text-base font-semibold text-ink">
                    Order received
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-slate">
                    Your payment was successful. This product
                    requires manual fulfilment, so we&rsquo;ll
                    process your order and provide the delivery
                    details separately.
                  </p>

                  <p className="mt-4 text-xs leading-relaxed text-slate">
                    Please keep your payment reference and check
                    your contact details for updates.
                  </p>
                </div>
              ) : item.deliveryType === "LINK" ? (
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary mt-5 inline-flex items-center gap-2"
                >
                  <ExternalLink size={16} />
                  Open Link
                </a>
              ) : (
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary mt-5 inline-flex items-center gap-2"
                >
                  <Download size={16} />
                  Download Now
                </a>
              )}
            </>
          )}
        </>
      )}

      {/* Error */}
      {state === "error" && (
        <h1 className="text-xl font-bold">
          We couldn&rsquo;t find that purchase.
        </h1>
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

