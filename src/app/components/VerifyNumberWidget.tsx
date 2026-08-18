"use client";

import { useState } from "react";
import { Search, X, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

type Result =
  | { status: "new"; phone: string }
  | { status: "activating"; phone: string; hoursRemaining: number }
  | { status: "verified"; phone: string };

export default function VerifyNumberWidget() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setChecking(true);
    const res = await fetch(`/api/verify-number?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();
    setChecking(false);
    if (!res.ok) {
      setError(data.error || "Couldn't check that number.");
      setResult(null);
      return;
    }
    setResult(data);
  }

  function reset() {
    setResult(null);
    setError("");
    setPhone("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3 text-left transition hover:border-primary/30"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mist text-primary">
          <Search size={16} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold">Verify a number first</span>
          <span className="block text-xs text-slate">New line? Check it can be served before you buy.</span>
        </span>
        <span className="text-slate">→</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mist text-primary">
            <Search size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold">Verify a number</p>
            <p className="text-xs text-slate">Check if the line can be served</p>
          </div>
        </div>
        <button onClick={() => { setOpen(false); reset(); }} aria-label="Close" className="text-slate hover:text-ink">
          <X size={18} />
        </button>
      </div>

      {!result && (
        <form onSubmit={handleCheck} className="mt-4 flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="024 XXX XXXX"
            maxLength={10}
            className="field"
            required
          />
          <button className="btn-primary shrink-0 !px-4" disabled={checking}>
            {checking ? "Checking…" : "Check"}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-ghRed">{error}</p>}

      {result?.status === "new" && (
        <div className="mt-4">
          <div className="flex items-start gap-2 rounded-lg border border-ghRed/25 bg-ghRed/5 p-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-ghRed" />
            <div>
              <p className="text-sm font-semibold text-ghRed">New number — activate first</p>
              <p className="mt-0.5 text-xs text-ink/70">{formatPhone(result.phone)} is not active on our system yet.</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-mist p-3 text-sm">
            <p className="text-xs text-slate">This number is new to our system. To serve it:</p>
            <ol className="mt-2 space-y-2">
              <Step n={1} text="Buy a 1GB bundle first." />
              <Step n={2} text="We verify & activate it — allow up to 72 hours for the new line to go through." />
              <Step n={3} text="After that, buy any amount and it delivers instantly." />
            </ol>
          </div>
        </div>
      )}

      {result?.status === "activating" && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-mtn/40 bg-mtn/10 p-3">
          <Clock size={16} className="mt-0.5 shrink-0 text-[#8A6D00]" />
          <div>
            <p className="text-sm font-semibold text-[#8A6D00]">Activating — almost there</p>
            <p className="mt-0.5 text-xs text-ink/70">
              {formatPhone(result.phone)} is being verified. About {result.hoursRemaining}h left before larger bundles deliver instantly.
            </p>
          </div>
        </div>
      )}

      {result?.status === "verified" && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/25 bg-primary/5 p-3">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-primary">Verified — ready to go</p>
            <p className="mt-0.5 text-xs text-ink/70">{formatPhone(result.phone)} can receive any bundle instantly.</p>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4 flex gap-2">
          <button onClick={reset} className="btn-secondary flex-1 !py-2 !text-sm">Check another</button>
          <button onClick={() => { setOpen(false); reset(); }} className="btn-primary flex-1 !py-2 !text-sm">Close</button>
        </div>
      )}
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mtn text-[11px] font-bold text-ink">{n}</span>
      <span className="text-ink/80">{text}</span>
    </li>
  );
}

function formatPhone(phone: string) {
  return phone.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
}
