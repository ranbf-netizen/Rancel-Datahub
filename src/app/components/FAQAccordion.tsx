"use client";

import { useState } from "react";

const FAQS = [
  { q: "How quickly will I receive my data?", a: "Most bundles are delivered within seconds of payment being confirmed. Occasionally network congestion on the supplier's side can add a short delay — you can always check progress on the Track Order page." },
  { q: "Which networks are supported?", a: "MTN, Telecel, and AirtelTigo (both BigData and iShare bundle types)." },
  { q: "Can I buy data for someone else?", a: "Yes — just enter their number as the recipient at checkout instead of your own." },
  { q: "Do I need an account?", a: "No. You can buy data or a results checker PIN as a guest with just a phone number. Creating an account just makes it easier to see your full order history in one place." },
  { q: "What happens if my transaction fails?", a: "If you were charged but didn't receive your data or PIN, use Track Order with your reference number, or reach out via WhatsApp — refunds for failed fulfillment are handled promptly." },
  { q: "Can I become a RanCel agent?", a: "Yes — apply on the Become an Agent page. Once approved, you can buy bundles at a discounted reseller rate and resell them at your own price." },
  { q: "How do I track my order?", a: "Go to Track Order and enter either your order reference (shown at checkout) or the phone number you used." },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
      {FAQS.map((item, i) => (
        <div key={item.q}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
            aria-expanded={openIndex === i}
          >
            <span className="text-sm font-semibold">{item.q}</span>
            <span
              className={`ml-4 shrink-0 text-primary transition-transform ${openIndex === i ? "rotate-45" : ""}`}
            >
              +
            </span>
          </button>
          {openIndex === i && (
            <div className="px-5 pb-4 text-sm text-slate">{item.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}
