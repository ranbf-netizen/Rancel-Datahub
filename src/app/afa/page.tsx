"use client";

import { useEffect, useState } from "react";

// The 16 regions of Ghana — a fixed list so the value sent to Cledanet is
// always a real region and never a free-typed variant.
const REGIONS = [
  "Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern",
  "Greater Accra", "North East", "Northern", "Oti", "Savannah",
  "Upper East", "Upper West", "Volta", "Western", "Western North",
];

function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

const EMPTY = {
  fullName: "",
  phoneNumber: "",
  idNumber: "",
  dateOfBirth: "",
  town: "",
  occupation: "",
  region: "",
  cropProduce: "",
};

export default function AfaPage() {
  const [price, setPrice] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/afa")
      .then((r) => r.json())
      .then((d) => setPrice(d.price ?? null))
      .catch(() => setPrice(null));
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const requiredFilled =
    form.fullName.trim() &&
    isValidGhanaNumber(form.phoneNumber) &&
    form.idNumber.trim() &&
    form.dateOfBirth &&
    form.town.trim() &&
    form.occupation.trim() &&
    form.region;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!requiredFilled) return;
    setStatus(null);
    setLoading(true);

    const res = await fetch("/api/afa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);

    if (data.authorizationUrl) {
      window.location.href = data.authorizationUrl;
      return;
    }
    setStatus(data.error || "Registration saved — payment setup is pending (Paystack keys not added yet).");
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">AFA Registration</p>
      <h1 className="mt-1 text-3xl font-bold">Register for AFA</h1>
      <p className="mt-2 text-slate">
        Fill in your details below to register. Your registration is submitted the moment your
        payment is confirmed — no account needed.
        {price !== null && (
          <> {" "}Registration fee: <span className="font-semibold text-ink">GH₵ {price.toFixed(2)}</span>.</>
        )}
      </p>

      <form onSubmit={handleSubmit} className="card mt-8 max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Full name</label>
            <input
              className="field"
              placeholder="As it appears on your ID"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Phone number</label>
            <input
              className="field"
              placeholder="024 XXX XXXX"
              value={form.phoneNumber}
              onChange={(e) => set("phoneNumber", e.target.value.replace(/[^\d]/g, ""))}
              maxLength={10}
              required
            />
          </div>

          <div>
            <label className="label">ID number</label>
            <input
              className="field"
              placeholder="Ghana Card / voter ID"
              value={form.idNumber}
              onChange={(e) => set("idNumber", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Date of birth</label>
            <input
              className="field"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Town</label>
            <input
              className="field"
              placeholder="Your town"
              value={form.town}
              onChange={(e) => set("town", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Occupation</label>
            <input
              className="field"
              placeholder="e.g. Farmer, Trader"
              value={form.occupation}
              onChange={(e) => set("occupation", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Region</label>
            <select
              className="field"
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
              required
            >
              <option value="" disabled>Select a region</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="label">Crop / produce <span className="text-slate">(optional)</span></label>
            <input
              className="field"
              placeholder="e.g. Cocoa, Maize — leave blank if not applicable"
              value={form.cropProduce}
              onChange={(e) => set("cropProduce", e.target.value)}
            />
          </div>
        </div>

        {status && <p className="mt-4 text-sm text-ghRed">{status}</p>}

        <button className="btn-primary mt-6 w-full" disabled={loading || !requiredFilled}>
          {loading
            ? "Starting checkout…"
            : price !== null
              ? `Continue to Payment — GH₵ ${price.toFixed(2)}`
              : "Continue to Payment"}
        </button>
        <p className="mt-2 text-center text-xs text-slate">
          You can track your registration afterwards at /track using your phone number.
        </p>
      </form>
    </div>
  );
}
