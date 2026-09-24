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
            transition: "stroke-dashoffset 1s linear, stroke 0.3s",
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
    phase?: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);

  // Customer must acknowledge that they requested the
  // Netflix sign-in code before the one-time check.
  const [codeRequested, setCodeRequested] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState<number>(60);

  /**
   * Load the purchase.
   */
  async function loadPurchase(checkCode = false) {
    if (!ref) {
      setErrorMessage("Missing purchase reference.");
      setState("error");
      return;
    }

    try {
      const query = new URLSearchParams({
        ref,
      });

      if (checkCode) {
        query.set("checkCode", "1");
      }

      const res = await fetch(
        `/api/digital-products/download?${query.toString()}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(
          data?.error ||
            "Something went wrong while loading your purchase."
        );
        setState("error");
        return;
      }

      if (data.status === "paid") {
        setItem(data);
        setState("paid");

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
        } else {
          setSecondsLeft(null);
        }

        return;
      }

      if (data.status === "pending") {
        setState("pending");
        return;
      }

      setErrorMessage(
        data?.error ||
          "Something went wrong while loading your purchase."
      );
      setState("error");
    } catch (error) {
      console.error("DOWNLOAD PAGE ERROR:", error);

      setErrorMessage(
        "We couldn't load your purchase. Please try again."
      );

      setState("error");
    }
  }

  /**
   * Initial payment/delivery check.
   */
  useEffect(() => {
    loadPurchase();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  /**
   * One-time Gmail code check.
   */
  async function checkForCode() {
    if (!ref || checkingCode || !codeRequested) return;

    setCheckingCode(true);
    setSecondsLeft(null);
    setCopied(false);

    try {
      const query = new URLSearchParams({
        ref,
        checkCode: "1",
      });

      const res = await fetch(
        `/api/digital-products/download?${query.toString()}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(
          data?.error || "We couldn't check for the code."
        );
        setState("error");
        return;
      }

      if (data.status === "paid") {
        setItem(data);
        setState("paid");

        if (
          data.phase === "revealed" &&
          typeof data.secondsRemaining === "number"
        ) {
          setSecondsLeft(data.secondsRemaining);

          setTotalSeconds(
            typeof data.totalSeconds === "number"
              ? data.totalSeconds
              : 60
          );
        } else {
          setSecondsLeft(null);
        }

        return;
      }

      if (data.status === "pending") {
        setState("pending");
        return;
      }

      setErrorMessage(
        data?.error || "We couldn't check for the code."
      );
      setState("error");
    } catch (error) {
      console.error("CHECK CODE ERROR:", error);

      setErrorMessage(
        "We couldn't check for the code. Please try again."
      );

      setState("error");
    } finally {
      // The acknowledgement is always reset after the
      // one-time check attempt.
      setCodeRequested(false);
      setCheckingCode(false);
    }
  }

  /**
   * Visual countdown.
   *
   * The backend remains authoritative.
   */
  useEffect(() => {
    if (secondsLeft === null) return;

    if (secondsLeft <= 0) {
      setItem((prev) =>
        prev
          ? {
              ...prev,
              revealContent: null,
              revealInstruction: null,
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
   * Copy revealed Gmail code.
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
            onClick={() => loadPurchase()}
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
               GMAIL LATEST FLOW
               ========================================= */
            <div className="mt-5 text-left">
              {/* -----------------------------------------
                  READY / FIRST VISIT
                 ----------------------------------------- */}
              {(item.phase === "ready" || !item.phase) && (
                <div className="rounded-2xl border border-ink/10 bg-mist/60 p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                      <Mail
                        size={18}
                        className="text-primary"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        Use this Gmail to sign in
                      </p>

                      <p className="mt-1 text-sm leading-relaxed text-slate">
                        Use the Gmail below when signing in and
                        request the verification code.
                      </p>

                      <p className="mt-2 break-all text-sm font-bold text-ink">
                        {item.gmailAddress ||
                          "Gmail address not configured"}
                      </p>
                    </div>
                  </div>

                  {/* Red caution */}
                  <div className="mt-4 rounded-xl border border-ghRed/20 bg-ghRed/5 p-4">
                    <div className="flex items-start gap-3">
                      <TriangleAlert
                        size={19}
                        className="mt-0.5 shrink-0 text-ghRed"
                      />

                      <div>
                        <p className="text-sm font-bold text-ghRed">
                          IMPORTANT
                        </p>

                        <p className="mt-1 text-sm leading-relaxed text-ink">
                          Please request your Netflix sign-in
                          code{" "}
                          <span className="font-bold">
                            BEFORE
                          </span>{" "}
                          clicking &ldquo;Check for code&rdquo;.
                        </p>

                        <p className="mt-2 text-xs leading-relaxed text-slate">
                          This is a one-time check. Make sure you
                          have requested the code on Netflix before
                          continuing.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Required acknowledgement */}
                  <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#006B3F]"
                      checked={codeRequested}
                      onChange={(e) =>
                        setCodeRequested(e.target.checked)
                      }
                      disabled={checkingCode}
                    />

                    <span className="leading-relaxed">
                      I confirm that I have requested a sign-in
                      code on Netflix.
                    </span>
                  </label>

                  {/* Check for code */}
                  <button
                    onClick={checkForCode}
                    disabled={
                      !codeRequested ||
                      checkingCode ||
                      !item.gmailAddress
                    }
                    className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {checkingCode ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <MailOpen size={16} />
                    )}

                    {checkingCode
                      ? "Checking for code…"
                      : "Check for code"}
                  </button>
                </div>
              )}

              {/* -----------------------------------------
                  CODE FOUND
                 ----------------------------------------- */}
              {item.phase === "revealed" &&
                item.revealContent && (
                  <div className="overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-ink/5 bg-gradient-to-r from-primary/5 to-transparent px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
                        <MailOpen
                          size={16}
                          className="text-primary"
                        />

                        Verification code
                      </span>

                      {secondsLeft !== null && (
                        <CountdownRing
                          secondsLeft={secondsLeft}
                          totalSeconds={totalSeconds}
                        />
                      )}
                    </div>

                    <div className="px-4 py-5 text-center">
                      {item.revealInstruction && (
                        <p className="mb-3 text-sm leading-relaxed text-slate">
                          {item.revealInstruction}
                        </p>
                      )}

                      <div className="rounded-xl bg-mist px-4 py-5">
                        <p className="font-mono text-3xl font-bold tracking-[0.2em] text-ink">
                          {item.revealContent}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 border-t border-ink/5 bg-mist/60 px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate">
                        <Clock size={12} />

                        {secondsLeft !== null &&
                        secondsLeft <= 10
                          ? "Closing fast — grab this now"
                          : "This code will disappear automatically"}
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

              {/* -----------------------------------------
                  CODE NOT FOUND
                 ----------------------------------------- */}
              {item.phase === "not_found" && (
                <div className="rounded-2xl border border-ghRed/20 bg-ghRed/5 p-5">
                  <div className="flex items-start gap-3">
                    <TriangleAlert
                      size={20}
                      className="mt-0.5 shrink-0 text-ghRed"
                    />

                    <div>
                      <p className="text-sm font-bold text-ghRed">
                        Code could not be retrieved
                      </p>

                      <p className="mt-2 text-sm leading-relaxed text-slate">
                        The one-time Gmail check did not retrieve
                        the verification code.
                      </p>

                      <p className="mt-2 text-xs leading-relaxed text-slate">
                        Please contact support with your payment
                        reference so the order can be checked.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* -----------------------------------------
                  ALREADY CHECKED
                 ----------------------------------------- */}
              {(item.phase === "checked" ||
                item.phase === "already_checked") && (
                <div className="rounded-2xl border border-ink/10 bg-mist/60 p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-2">
                      <CheckCircle2
                        size={18}
                        className="text-primary"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-ink">
                        One-time code check used
                      </p>

                      <p className="mt-2 text-sm leading-relaxed text-slate">
                        This purchase has already used its
                        one-time verification code check.
                      </p>

                      <p className="mt-2 text-xs leading-relaxed text-slate">
                        If you need assistance with your order,
                        please contact support and provide your
                        payment reference.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* -----------------------------------------
                  EXPIRED
                 ----------------------------------------- */}
              {item.phase === "expired" && (
                <div className="rounded-2xl border border-ink/10 bg-mist/60 p-5">
                  <div className="flex items-start gap-3">
                    <Clock
                      size={20}
                      className="mt-0.5 shrink-0 text-slate"
                    />

                    <div>
                      <p className="text-sm font-semibold text-ink">
                        Code display expired
                      </p>

                      <p className="mt-2 text-sm leading-relaxed text-slate">
                        The verification code is no longer
                        displayed. This purchase has already used
                        its one-time code check.
                      </p>
                    </div>
                  </div>
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
        <>
          <h1 className="text-xl font-bold">
            Something went wrong
          </h1>

          <p className="mt-2 text-sm text-slate">
            {errorMessage ||
              "We couldn't load your purchase."}
          </p>

          <button
            onClick={() => loadPurchase()}
            className="btn-primary mt-4"
          >
            Try again
          </button>
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
