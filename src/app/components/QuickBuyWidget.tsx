"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Bundle = {
  id: string;
  network: string;
  label: string;
  dataSizeGb: number;
  sellingPrice: number;
};

const NETWORKS: { key: string; label: string; dot: string }[] = [
  { key: "MTN", label: "MTN", dot: "bg-mtn" },
  { key: "TELECEL", label: "Telecel", dot: "bg-telecel" },
  { key: "AIRTELTIGO_ISHARE", label: "AirtelTigo iShare", dot: "bg-airteltigo" },
  { key: "AIRTELTIGO_BIGTIME", label: "AirtelTigo BigTime", dot: "bg-airteltigo" },
];

// Ghana mobile numbers: 0 + 9 digits, common prefixes.
function isValidGhanaNumber(value: string) {
  return /^0\d{9}$/.test(value.trim());
}

export default function QuickBuyWidget() {
  const router = useRouter();
  const [allBundles, setAllBundles] = useState<Bundle[]>([]);
  const [network, setNetwork] = useState("MTN");
  const [bundleId, setBundleId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    fetch("/api/bundles")
      .then((r) => r.json())
      .then((d) => setAllBundles(Array.isArray(d) ? d : []))
      .catch(() => setAllBundles([]));
  }, []);

  const bundlesForNetwork = allBundles.filter((b) => b.network === network);
  const selected = bundlesForNetwork.find((b) => b.id === bundleId) || null;
  const phoneValid = phone.length === 0 || isValidGhanaNumber(phone);

  function selectNetwork(key: string) {
    setNetwork(key);
    setBundleId(null);
  }

  function handleContinue() {
    setTouched(true);
    if (!selected || !isValidGhanaNumber(phone)) return;
    // Hands off to the full /data flow with selections pre-filled via query params.
    router.push(`/data?network=${network}&bundle=${selected.id}&phone=${encodeURIComponent(phone)}`);
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Quick Buy</p>
        <h2 className="mt-1 text-xl font-bold text-white">Get data in under a minute</h2>

        {/* Network selector */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">Choose network</p>
          <div className="grid grid-cols-2 gap-2">
            {NETWORKS.map((n) => (
              <button
                key={n.key}
                onClick={() => selectNetwork(n.key)}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  network === n.key
                    ? "border-white/40 bg-white/10 text-white"
                    : "border-white/10 text-white/60 hover:bg-white/5"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${n.dot}`} />
                {n.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bundle selector */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">Choose bundle</p>
          <div className="flex flex-wrap gap-2">
            {bundlesForNetwork.length === 0 && (
              <p className="text-xs text-white/40">No bundles synced for this network yet.</p>
            )}
            {bundlesForNetwork.map((b) => (
              <button
                key={b.id}
                onClick={() => setBundleId(b.id)}
                className={`rounded-xl border px-3.5 py-2 text-sm font-semibold transition ${
                  bundleId === b.id
                    ? "border-white bg-white text-ink"
                    : "border-white/10 text-white/70 hover:bg-white/5"
                }`}
              >
                {b.dataSizeGb}GB
              </button>
            ))}
          </div>
        </div>

        {/* Phone input */}
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/50">Recipient number</p>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="024 XXX XXXX"
            maxLength={10}
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
          {touched && !phoneValid && (
            <p className="mt-1 text-xs text-ghRed">Enter a valid 10-digit Ghana number, e.g. 0241234567.</p>
          )}
        </div>

        {/* Order summary preview */}
        {selected && (
          <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <div className="flex justify-between"><span>Bundle</span><span className="font-semibold text-white">{selected.dataSizeGb}GB</span></div>
            <div className="mt-1 flex justify-between"><span>Price</span><span className="font-semibold text-white">GH₵ {selected.sellingPrice.toFixed(2)}</span></div>
            <div className="mt-1 flex justify-between"><span>Delivery</span><span className="text-white">Fast delivery</span></div>
          </div>
        )}

        <button
          onClick={handleContinue}
          className="btn-primary mt-5 w-full !bg-white !text-ink hover:!bg-white/90"
        >
          Continue to Payment
        </button>
      </div>
  );
}
