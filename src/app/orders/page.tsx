"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const [dataOrders, setDataOrders] = useState<any[]>([]);
  const [pinOrders, setPinOrders] = useState<any[]>([]);
  const [verifying, setVerifying] = useState(false);

  function loadOrders() {
    fetch("/api/orders").then((r) => r.json()).then((d) => setDataOrders(Array.isArray(d) ? d : []));
    fetch("/api/pins/mine").then((r) => r.json()).then((d) => setPinOrders(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    loadOrders();
  }, []);

  // If we just landed back from Paystack checkout, actively double-check that
  // specific payment instead of waiting on the webhook - closes the "stuck on
  // Pending" gap if the webhook is slow or never arrives.
  useEffect(() => {
    if (!ref) return;
    setVerifying(true);
    fetch("/api/orders/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: ref }),
    })
      .finally(() => {
        setVerifying(false);
        loadOrders();
      });
  }, [ref]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-3xl font-bold">My Orders</h1>
      {verifying && (
        <p className="mt-3 text-sm text-ink/60">Confirming your payment with Paystack…</p>
      )}

      <h2 className="mt-8 text-lg font-semibold">Data Bundles</h2>
      <div className="mt-3 space-y-3">
        {dataOrders.map((o) => (
          <div key={o.id} className="card flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
            <div>
              <p className="font-medium">{o.bundle.dataSizeGb}GB · {o.bundle.network.toUpperCase()} → {o.beneficiaryNumber}</p>
              <p className="text-ink/50">GH₵ {o.amount.toFixed(2)} · {new Date(o.createdAt).toLocaleString()}</p>
            </div>
            <StatusBadge payment={o.paymentStatus} fulfillment={o.fulfillmentStatus} />
          </div>
        ))}
        {dataOrders.length === 0 && <p className="text-sm text-ink/50">No data orders yet.</p>}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Results Checker PINs</h2>
      <div className="mt-3 space-y-3">
        {pinOrders.map((o) => (
          <div key={o.id} className="card text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">{[o.examType, o.year].filter(Boolean).join(" ") || "Results Checker"}</p>
              <span className="rounded-full bg-sand px-3 py-1 text-xs font-medium">{o.paymentStatus}</span>
            </div>
            {o.pin && o.paymentStatus === "PAID" && (
              <div className="mt-2 rounded-md bg-moss/10 p-3 font-mono text-sm">
                Serial: {o.pin.serialNumber} · PIN: {o.pin.pinCode}
              </div>
            )}
          </div>
        ))}
        {pinOrders.length === 0 && <p className="text-sm text-ink/50">No PIN orders yet.</p>}
      </div>
    </div>
  );
}

function StatusBadge({ payment, fulfillment }: { payment: string; fulfillment: string }) {
  const label = payment !== "PAID" ? payment : fulfillment;
  const color =
    label === "DELIVERED" ? "bg-moss/15 text-moss" :
    label === "FAILED" ? "bg-red-100 text-red-700" :
    "bg-sand text-ink/70";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${color} shrink-0`}>{label}</span>;
}
