"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Smartphone, Copy, Check, Clock, XCircle, PhoneOff, RotateCcw, Search } from "lucide-react";

function CountdownRing({ secondsLeft, totalSeconds }: { secondsLeft: number; totalSeconds: number }) {
const radius = 26;
const circumference = 2 * Math.PI * radius;
const fraction = totalSeconds > 0 ? secondsLeft / totalSeconds : 0;
const offset = circumference * (1 - fraction);
const color = fraction > 0.5 ? "#006B3F" : fraction > 0.2 ? "#FFCC08" : "#CE1126";
return ( <div className="relative inline-flex h-16 w-16 items-center justify-center"> <svg viewBox="0 0 60 60" className="h-16 w-16 -rotate-90"> <circle cx="30" cy="30" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="5" />
<circle
cx="30" cy="30" r={radius} fill="none" stroke={color} strokeWidth="5"
strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
/> </svg> <span className="absolute text-sm font-bold text-ink">{secondsLeft}</span> </div>
);
}

type Country = { ID: string; name: string; region?: string };
type Service = { ID: string; name: string };
type MyOrder = { id: string; countryName: string; serviceName: string; amount: number; paymentStatus: string; status: string; phoneNumber: string | null; smsCode: string | null; createdAt: string; paystackReference: string };

function RevealPanel({ reference }: { reference: string }) {
const [status, setStatus] = useState<"loading" | "pending" | "waiting" | "received" | "expired" | "failed" | "error">("loading");
const [data, setData] = useState<any>(null);
const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
const [totalSeconds, setTotalSeconds] = useState(600);
const [copied, setCopied] = useState(false);
const [resending, setResending] = useState(false);
const [resendError, setResendError] = useState("");

async function poll() {
try {
const res = await fetch(`/api/sms-numbers/status?ref=${reference}`);
const d = await res.json();
if (!res.ok) { setStatus("error"); return; }
setData(d);
setStatus(d.status);
if (typeof d.secondsRemaining === "number" && (d.status === "waiting" || d.status === "received")) {
setSecondsLeft(d.secondsRemaining);
setTotalSeconds((t) => (d.status === "waiting" && secondsLeft === null ? d.secondsRemaining : t));
}
} catch {
setStatus("error");
}
}

useEffect(() => {
poll();
const interval = setInterval(poll, status === "received" ? 5000 : 4000);
return () => clearInterval(interval);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [status === "received"]);

useEffect(() => {
if (secondsLeft === null || status === "received") return;
if (secondsLeft <= 0) { setStatus("expired"); return; }
const t = setTimeout(() => setSecondsLeft((s) => (s !== null ? s - 1 : s)), 1000);
return () => clearTimeout(t);
}, [secondsLeft, status]);

async function requestAgain() {
setResending(true);
setResendError("");
try {
const res = await fetch("/api/sms-numbers/resend", {
method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: reference }),
});
const d = await res.json();
if (!res.ok) { setResendError(d.error || "Could not request the code again."); return; }
setCopied(false);
setStatus("waiting");
poll();
} catch {
setResendError("Could not request the code again.");
} finally {
setResending(false);
}
}

if (status === "loading") {
return <p className="mt-8 inline-flex items-center gap-2 text-slate"><Loader2 size={16} className="animate-spin" /> Checking your order…</p>;
}
if (status === "pending") {
return <p className="mt-8 inline-flex items-center gap-2 text-slate"><Loader2 size={16} className="animate-spin" /> Confirming your payment…</p>;
}
if (status === "failed") {
return ( <div className="card mt-8 flex flex-col items-center gap-2 !p-8 text-center"> <XCircle size={28} className="text-ghRed" /> <p className="font-semibold text-ink">Couldn’t rent a number</p> <p className="text-sm text-slate">{data?.message || "This order has been flagged for a refund."}</p> </div>
);
}
if (status === "error") {
return <p className="mt-8 text-sm text-ghRed">Something went wrong checking this order. Refresh to try again.</p>;
}

const expired = status === "expired";
const received = status === "received";

return ( <div className="mt-8 overflow-hidden rounded-2xl border border-primary/15 bg-white shadow-sm"> <div className="flex items-center justify-between gap-3 border-b border-ink/5 bg-gradient-to-r from-primary/5 to-transparent px-5 py-4"> <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink"> <Smartphone size={16} className="text-primary" /> {data?.serviceName} · {data?.countryName} </span>
{!expired && secondsLeft !== null && <CountdownRing secondsLeft={secondsLeft} totalSeconds={totalSeconds} />} </div>


  <div className="px-5 py-6 text-center">
    <p className="text-xs uppercase tracking-wide text-slate">Your number</p>
    <p className="mt-1 font-mono text-2xl font-bold text-ink">{data?.phoneNumber || "—"}</p>

    {expired ? (
      <div className="mt-5 flex flex-col items-center gap-2">
        <PhoneOff size={26} className="text-slate" />
        <p className="text-sm font-semibold text-ink">Rental window closed</p>
        <p className="text-xs text-slate">No code arrived in time. Contact support if you were charged and got nothing.</p>
      </div>
    ) : received ? (
      <div className="mt-5">
        <p className="text-xs uppercase tracking-wide text-slate">Verification code</p>
        <p className="mt-1 font-mono text-3xl font-bold tracking-widest text-primary">{data.smsCode}</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(data.smsCode || ""); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="btn-primary inline-flex items-center gap-2"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy code"}
          </button>
          <button
            onClick={requestAgain}
            disabled={resending}
            title="Code wrong or didn't work? Get a fresh one on the same number."
            className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {resending ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            {resending ? "Requesting…" : "Request again"}
          </button>
        </div>
        {resendError && <p className="mt-2 text-xs text-ghRed">{resendError}</p>}
        {data.fullSms && <p className="mt-3 text-xs text-slate">Full message: {data.fullSms}</p>}
      </div>
    ) : (
      <div className="mt-5 flex flex-col items-center gap-2">
        <Loader2 size={20} className="animate-spin text-primary" />
        <p className="text-sm text-slate">Waiting for the code to arrive…</p>
      </div>
    )}
  </div>

  {!expired && !received && (
    <div className="flex items-center justify-center gap-1.5 border-t border-ink/5 bg-mist/60 px-4 py-2.5 text-xs text-slate">
      <Clock size={12} /> This checks for your code automatically
    </div>
  )}
</div>


);
}

function ServiceSearch({
services, serviceId, onSelect,
}: { services: Service[]; serviceId: string; onSelect: (s: Service) => void }) {
const [query, setQuery] = useState("");
const [open, setOpen] = useState(false);
const wrapRef = useRef<HTMLDivElement>(null);

const selected = services.find((s) => s.ID === serviceId) || null;

const results = useMemo(() => {
const q = query.trim().toLowerCase();
if (!q) return services.slice(0, 8);
return services.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
}, [services, query]);

useEffect(() => {
function onClickOutside(e: MouseEvent) {
if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
}
document.addEventListener("mousedown", onClickOutside);
return () => document.removeEventListener("mousedown", onClickOutside);
}, []);

return ( <div ref={wrapRef} className="relative"> <div className="relative"> <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate" />
<input
className="field pl-9"
placeholder="Search services (WhatsApp, Google, Telegram…)"
value={open ? query : selected?.name || query}
onFocus={() => { setOpen(true); setQuery(""); }}
onChange={(e) => setQuery(e.target.value)}
/> </div>
{open && ( <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-ink/10 bg-white shadow-lg">
{results.length === 0 ? ( <p className="px-3 py-3 text-sm text-slate">No matching services.</p>
) : (
results.map((s) => (
<button
key={s.ID}
type="button"
onClick={() => { onSelect(s); setQuery(""); setOpen(false); }}
className={`block w-full px-3 py-2 text-left text-sm hover:bg-mist ${s.ID === serviceId ? "bg-mist font-medium text-primary" : "text-ink"}`}
>
{s.name} </button>
))
)} </div>
)} </div>
);
}

function SmsNumbersInner() {
const params = useSearchParams();
const ref = params.get("ref");

const [needAuth, setNeedAuth] = useState(false);
const [countries, setCountries] = useState<Country[]>([]);
const [services, setServices] = useState<Service[]>([]);
const [loading, setLoading] = useState(true);
const [countryId, setCountryId] = useState("");
const [serviceId, setServiceId] = useState("");
const [price, setPrice] = useState<number | null>(null);
const [pricing, setPricing] = useState(false);
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState("");
const [orders, setOrders] = useState<MyOrder[]>([]);

useEffect(() => {
if (ref) return;
fetch("/api/sms-numbers/catalog").then((r) => {
if (r.status === 401) { setNeedAuth(true); return null; }
return r.json();
}).then((d) => {
if (d?.countries) setCountries(d.countries);
if (d?.services) setServices(d.services);
}).finally(() => setLoading(false));


fetch("/api/sms-numbers/order")
  .then((r) => r.ok ? r.json() : null)
  .then((d) => { if (d?.orders) setOrders(d.orders); })
  .catch(() => {});


}, [ref]);

useEffect(() => {
setPrice(null);
setError("");


if (!countryId || !serviceId) return;

setPricing(true);

const t = setTimeout(async () => {
  try {
    const res = await fetch(
      `/api/sms-numbers/price?country=${encodeURIComponent(countryId)}&service=${encodeURIComponent(serviceId)}`
    );

    const d = await res.json();

    if (!res.ok) {
      throw new Error(d.error || "Could not get the SMS price.");
    }

    if (typeof d.amount !== "number") {
      throw new Error("SMSPool did not return a valid price.");
    }

    setPrice(d.amount);
  } catch (err) {
    setPrice(null);
    setError(err instanceof Error ? err.message : "Could not get the SMS price.");
  } finally {
    setPricing(false);
  }
}, 350);

return () => clearTimeout(t);


}, [countryId, serviceId]);

async function submit() {
setError("");
if (!countryId || !serviceId) { setError("Choose a country and a service."); return; }
setSubmitting(true);
const country = countries.find((c) => c.ID === countryId);
const service = services.find((s) => s.ID === serviceId);
const res = await fetch("/api/sms-numbers/order", {
method: "POST", headers: { "Content-Type": "application/json" },
body: JSON.stringify({ countryId, countryName: country?.name, serviceId, serviceName: service?.name }),
});
const data = await res.json();
setSubmitting(false);
if (data.authorizationUrl) { window.location.href = data.authorizationUrl; return; }
setError(data.error || "Could not start order.");
}

if (ref) {
return ( <div className="mx-auto max-w-md px-5 py-10"> <p className="text-xs font-semibold uppercase tracking-widest text-primary">SMS Numbers</p> <h1 className="mt-1 text-2xl font-bold">Your rented number</h1> <RevealPanel reference={ref} /> </div>
);
}

if (needAuth) {
return ( <div className="mx-auto max-w-md px-5 py-20 text-center"> <Smartphone className="mx-auto text-primary" size={36} /> <h1 className="mt-4 text-2xl font-bold">Sign in to rent a number</h1> <p className="mt-2 text-slate">Create a free Rancel DataHub account or log in to rent an SMS-verification number.</p> <a href="/register" className="btn-primary mt-5 inline-block">Sign up free</a> <a href="/login" className="mt-2 block text-sm text-primary hover:underline">I already have an account</a> </div>
);
}

return ( <div className="mx-auto max-w-2xl px-5 py-10"> <p className="text-xs font-semibold uppercase tracking-widest text-primary">SMS Numbers</p> <h1 className="mt-1 text-3xl font-bold">Rent a number, get your code</h1> <p className="mt-2 text-slate">Pick a service and country — pay, and your number and verification code show up live.</p>


  {loading && <p className="mt-8 inline-flex items-center gap-2 text-slate"><Loader2 size={16} className="animate-spin" /> Loading catalog…</p>}

  {!loading && countries.length > 0 && (
    <div className="card mt-6">
      <label className="label">Service</label>
      <ServiceSearch services={services} serviceId={serviceId} onSelect={(s) => setServiceId(s.ID)} />

      <label className="label mt-4">Country</label>
      <select className="field" value={countryId} onChange={(e) => setCountryId(e.target.value)}>
        <option value="">Choose a country…</option>
        {countries.map((c) => <option key={c.ID} value={c.ID}>{c.name}</option>)}
      </select>

      <div className="mt-4 flex items-center justify-between rounded-lg bg-mist p-3">
        <span className="text-sm font-medium">Price</span>
        <span className="text-lg font-bold text-primary">
          {pricing ? <Loader2 size={16} className="animate-spin" /> : price !== null ? `GH₵ ${price.toFixed(2)}` : "—"}
        </span>
      </div>

      {error && <p className="mt-3 text-sm text-ghRed">{error}</p>}

      <button onClick={submit} disabled={submitting || price === null} className="btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-50">
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? "Starting…" : "Rent this number"}
      </button>
    </div>
  )}

  {orders.length > 0 && (
    <div className="mt-10">
      <h2 className="text-lg font-bold">My SMS number orders</h2>
      <div className="mt-3 space-y-2">
        {orders.map((o) => (
          <a key={o.id} href={`/shop/sms-numbers?ref=${o.paystackReference}`} className="card flex items-center justify-between !p-4 text-sm hover:bg-mist/50">
            <div>
              <p className="font-medium">{o.serviceName} · {o.countryName}</p>
              <p className="text-xs text-slate">{new Date(o.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">GH₵ {o.amount.toFixed(2)}</p>
              <p className="text-xs font-medium text-slate">{o.paymentStatus === "PAID" ? (o.status || "Processing") : "Awaiting payment"}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )}
</div>


);
}

export default function SmsNumbersPage() {
return (
<Suspense fallback={<div className="px-5 py-20 text-center text-slate">Loading…</div>}> <SmsNumbersInner /> </Suspense>
);
}
