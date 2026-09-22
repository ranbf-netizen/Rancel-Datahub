"use client";

import { useState } from "react";

const NETWORKS = [
  { key: "mtn", label: "MTN", color: "#FFCC08", dark: true },
  { key: "telecel", label: "Telecel", color: "#E4032E", dark: false },
  { key: "airteltigo", label: "AirtelTigo", color: "#0033A0", dark: false },
] as const;

export default function LiveDeliveryAnimation() {
  const [active, setActive] = useState<(typeof NETWORKS)[number]>(NETWORKS[0]);

  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Delivered in real time</p>
          <h3 className="mt-1 text-xl font-bold">Watch it work</h3>
        </div>
        <div className="flex gap-2">
          {NETWORKS.map((n) => (
            <button
              key={n.key}
              onClick={() => setActive(n)}
              className="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition"
              style={{
                borderColor: active.key === n.key ? n.color : "rgba(15,23,42,0.12)",
                backgroundColor: active.key === n.key ? n.color : "transparent",
                color: active.key === n.key ? (n.dark ? "#0F172A" : "#FFFFFF") : "#64748B",
              }}
            >
              {n.label}
            </button>
          ))}
        </div>
      </div>

      <svg viewBox="0 0 640 200" className="mt-6 w-full" role="img" aria-label={`Data being delivered to a ${active.label} number`}>
        {/* Tower */}
        <g transform="translate(50,60)">
          <path d="M0 80 L20 0 L40 80" stroke="#0F172A" strokeWidth="3" fill="none" strokeLinejoin="round" />
          <line x1="6" y1="55" x2="34" y2="55" stroke="#0F172A" strokeWidth="3" />
          <line x1="12" y1="30" x2="28" y2="30" stroke="#0F172A" strokeWidth="3" />
          {/* pulsing signal arcs */}
          {[18, 30, 42].map((r, i) => (
            <path
              key={r}
              d={`M${20 - r} 0 A${r} ${r} 0 0 1 ${20 + r} 0`}
              stroke={active.color}
              strokeWidth="2.5"
              fill="none"
              opacity="0"
              style={{
                animation: `signalPulse 2.4s ease-out infinite`,
                animationDelay: `${i * 0.4}s`,
              }}
            />
          ))}
        </g>

        {/* Dashed path */}
        <line x1="110" y1="100" x2="500" y2="100" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="6 8" />

        {/* Traveling packets */}
        {[0, 1, 2, 3].map((i) => (
          <circle
            key={i}
            cy="100"
            r="6"
            fill={active.color}
            style={{
              animation: `travelPacket 3s linear infinite`,
              animationDelay: `${i * 0.75}s`,
            }}
          />
        ))}

        {/* Phone */}
        <g transform="translate(500,50)">
          <rect x="0" y="0" width="60" height="100" rx="10" fill="none" stroke="#0F172A" strokeWidth="3" />
          <line x1="20" y1="88" x2="40" y2="88" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          <g style={{ animation: "checkPop 3s ease-in-out infinite" }}>
            <circle cx="30" cy="45" r="16" fill={active.color} opacity="0.15" />
            <path d="M22 45l6 6 12-13" stroke={active.color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </svg>

      <p className="mt-4 text-center text-sm text-slate">
        Every order on {active.label} follows this same path — payment confirmed, bundle sent, done.
      </p>

      <style jsx>{`
        @keyframes travelPacket {
          0% {
            transform: translateX(110px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(500px);
            opacity: 0;
          }
        }
        @keyframes signalPulse {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          30% {
            opacity: 0.7;
          }
          100% {
            opacity: 0;
            transform: scale(1.15);
          }
        }
        @keyframes checkPop {
          0%,
          70% {
            opacity: 0.3;
            transform: scale(0.9);
          }
          85% {
            opacity: 1;
            transform: scale(1.08);
          }
          100% {
            opacity: 0.3;
            transform: scale(0.9);
          }
        }
      `}</style>
    </div>
  );
}
