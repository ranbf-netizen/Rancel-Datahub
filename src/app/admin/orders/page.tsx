"use client";

import { useEffect, useState } from "react";

export default function AdminOrdersPage() {
  const [dataOrders, setDataOrders] = useState<any[]>([]);
  const [pinOrders, setPinOrders] = useState<any[]>([]);
  const [checkingRef, setCheckingRef] = useState<string | null>(null);
  const [checkingDelivery, setCheckingDelivery] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/orders").then((r) => r.json()).then((d) => {
      setDataOrders(d.dataOrders || []);
      setPinOrders(d.pinOrders || []);
    });
  }

  useEffect(load, []);

  async function checkNow(reference: string) {
    setCheckingRef(reference);
    const res = await fetch("/api/orders/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
    const data = await res.json();
    setCheckingRef(null);
    if (!res.ok) {
      alert(data.error || "Could not check this order.");
      return;
    }
    alert(`Paystack says: ${data.paystackStatus}`);
    load();
  }

  // Asks Cledanet directly whether a stuck PROCESSING order actually delivered,
  // then updates the order to DELIVERED or FAILED accordingly.
  async function checkDelivery(orderId: string) {
    setCheckingDelivery(orderId);
    const res = await fetch("/api/admin/orders/check-delivery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json();
    setCheckingDelivery(null);
    if (!res.ok) {
      alert(data.error || "Could not check delivery.");
      return;
    }
    alert(`Cledanet says: ${data.supplierStatus}`);
    load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>

      <h2 className="mt-6 text-lg font-semibold">Data Bundle Orders</h2>
      <div className="overflow-x-auto"><table className="mt-2 w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase text-ink/50">
            <th className="py-2">Customer</th><th>Bundle</th><th>Recipient</th><th>Amount</th><th>Payment</th><th>Fulfillment</th><th>Failure reason</th><th></th>
          </tr>
        </thead>
        <tbody>
          {dataOrders.map((o) => (
            <tr key={o.id} className="border-b border-ink/5">
              <td className="py-2">{o.user ? o.user.name : <span className="text-slate">Guest · {o.beneficiaryNumber}</span>}</td>
              <td>{o.bundle.dataSizeGb}GB {o.bundle.network.toUpperCase()}</td>
              <td>{o.beneficiaryNumber}</td>
              <td>GH₵ {o.amount.toFixed(2)}</td>
              <td>{o.paymentStatus}</td>
              <td>{o.fulfillmentStatus}</td>
              <td className="max-w-[280px] whitespace-normal break-words text-xs text-ghRed">
                {o.failureReason || "—"}
              </td>
              <td>
                {(o.paymentStatus === "PENDING" || o.fulfillmentStatus === "FAILED") && o.paystackReference && (
                  <button
                    className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-50"
                    disabled={checkingRef === o.paystackReference}
                    onClick={() => checkNow(o.paystackReference)}
                  >
                    {checkingRef === o.paystackReference ? "Checking…" : "Check now"}
                  </button>
                )}
                {o.paymentStatus === "PAID" && o.fulfillmentStatus === "PROCESSING" && (
                  <button
                    className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-50"
                    disabled={checkingDelivery === o.id}
                    onClick={() => checkDelivery(o.id)}
                  >
                    {checkingDelivery === o.id ? "Checking…" : "Check delivery"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <h2 className="mt-10 text-lg font-semibold">PIN Orders</h2>
      <div className="overflow-x-auto"><table className="mt-2 w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-ink/10 text-left text-xs uppercase text-ink/50">
            <th className="py-2">Customer</th><th>Exam</th><th>Amount</th><th>Payment</th><th>PIN assigned</th><th></th>
          </tr>
        </thead>
        <tbody>
          {pinOrders.map((o) => (
            <tr key={o.id} className="border-b border-ink/5">
              <td className="py-2">{o.user ? o.user.name : <span className="text-slate">Guest{o.guestPhone ? ` · ${o.guestPhone}` : ""}</span>}</td>
              <td>{o.examType} {o.year}</td>
              <td>GH₵ {o.amount.toFixed(2)}</td>
              <td>{o.paymentStatus}</td>
              <td>{o.pin ? o.pin.serialNumber : "—"}</td>
              <td>
                {o.paymentStatus === "PENDING" && o.paystackReference && (
                  <button
                    className="rounded-md border border-ink/15 px-3 py-1 text-xs font-medium hover:bg-mist disabled:opacity-50"
                    disabled={checkingRef === o.paystackReference}
                    onClick={() => checkNow(o.paystackReference)}
                  >
                    {checkingRef === o.paystackReference ? "Checking…" : "Check now"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}
