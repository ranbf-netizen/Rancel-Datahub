"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

type Result = {
  type: "data" | "pin";
  reference: string;
  network?: string;
  dataSizeGb?: number;
  beneficiaryNumber?: string;
  examType?: string;
  year?: number;
  amount: number;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  fulfillmentStatus?: "NOT_STARTED" | "PROCESSING" | "DELIVERED" | "FAILED";
  createdAt: string;
  pin?: { serialNumber: string; pinCode: string } | null;
};

export default function TrackPage() {
  return (
    <Suspense fallback={null}>
      <TrackPageInner />
    </Suspense>
  );
}

function TrackPageInner() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("ref") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [single, setSingle] = useState<Result | null>(null);
  const [list, setList] = useState<Result[] | null>(null);

  async function runSearch(value: string) {
    if (!value.trim()) return;
    setLoading(true);
    setError("");
    setSingle(null);
    setList(null);

    const looksLikeReference = /^RDH-/i.test(value.trim());
    const body = looksLikeReference ? { reference: value.trim() } : { phone: value.trim() };

    const res = await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    if (data.results) setList(data.results);
    else setSingle(data);
  }

  useEffect(() => {
    if (searchParams.get("ref")) runSearch(searchParams.get("ref")!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Track your order</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Where's my order?</h1>
      <p className="mt-2 text-slate">
        Enter your order reference or the phone number you used to see its status.
      </p>

      <form
        onSubmit={(e) => { e.preventDefault(); runSearch(query); }}
        className="mt-6 flex flex-col gap-3 sm:flex-row"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="RDH-DATA-... or 024XXXXXXX"
          className="field"
        />
        <button className="btn-primary inline-flex items-center justify-center gap-2 sm:w-auto" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Searching…" : "Track Order"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-xl border border-ghRed/20 bg-ghRed/5 p-4 text-sm text-ink/70">{error}</p>
      )}

      {single && <OrderDetail result={single} />}

      {list && (
        <div className="mt-8 space-y-4">
          {list.map((r) => (
            <div key={r.reference} className="card">
              <SummaryLine result={r} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryLine({ result }: { result: Result }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div>
        <p className="font-medium">
          {result.type === "data"
            ? `${result.dataSizeGb}GB · ${result.network?.toUpperCase()}`
            : `${result.examType} ${result.year} PIN`}
        </p>
        <p className="text-slate">GH₵ {result.amount.toFixed(2)} · {new Date(result.createdAt).toLocaleDateString()}</p>
      </div>
      <StatusPill result={result} />
    </div>
  );
}

function StatusPill({ result }: { result: Result }) {
  const label =
    result.paymentStatus !== "PAID"
      ? result.paymentStatus
      : result.type === "data"
      ? result.fulfillmentStatus
      : "PAID";
  const color =
    label === "DELIVERED" ? "bg-primary/10 text-primary" :
    label === "FAILED" ? "bg-ghRed/10 text-ghRed" :
    label === "PAID" ? "bg-primary/10 text-primary" :
    "bg-mist text-slate";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${color}`}>{label}</span>;
}

function OrderDetail({ result }: { result: Result }) {
  const steps = [
    { key: "received", label: "Order received", done: true },
    { key: "confirmed", label: "Payment confirmed", done: result.paymentStatus === "PAID" },
    {
      key: "processing",
      label: result.type === "data" ? "Processing" : "Assigning PIN",
      done: result.paymentStatus === "PAID",
    },
    {
      key: "delivered",
      label: result.type === "data" ? "Data delivered" : "PIN revealed",
      done: result.type === "data" ? result.fulfillmentStatus === "DELIVERED" : result.paymentStatus === "PAID",
    },
  ];
  const failed = result.paymentStatus === "FAILED" || result.fulfillmentStatus === "FAILED";

  return (
    <div className="card mt-8">
      <div className="flex items-center justify-between">
        <p className="font-semibold">
          {result.type === "data"
            ? `${result.dataSizeGb}GB · ${result.network?.toUpperCase()} → ${result.beneficiaryNumber}`
            : `${result.examType} ${result.year} Results Checker PIN`}
        </p>
        <StatusPill result={result} />
      </div>
      <p className="mt-1 text-xs text-slate">Ref: {result.reference}</p>

      {failed ? (
        <p className="mt-6 rounded-xl border border-ghRed/20 bg-ghRed/5 p-4 text-sm">
          This order didn't go through. If you were charged, contact support via WhatsApp with your
          reference above and we'll sort out a refund.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  s.done ? "bg-primary text-white" : "border border-ink/15 text-ink/30"
                }`}
              >
                {s.done ? <Check size={14} /> : i + 1}
              </span>
              <span className={s.done ? "font-medium text-ink" : "text-slate"}>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {result.type === "pin" && result.pin && (
        <div className="mt-6 rounded-xl bg-primary/5 p-4 font-mono text-sm">
          Serial: {result.pin.serialNumber} · PIN: {result.pin.pinCode}
        </div>
      )}
    </div>
  );
}
