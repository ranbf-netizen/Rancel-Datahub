const UNSUPPORTED = [
  "Turbonet SIM",
  "Merchant SIM",
  "EVD SIM",
  "Broadband SIM",
  "Blacklisted SIM",
  "Roaming SIM",
  "Different Network",
  "Wrong Number",
  "Inactive Number",
];

export default function UnsupportedSimNotice() {
  const track = [...UNSUPPORTED, ...UNSUPPORTED];
  return (
    <div className="rounded-2xl border border-ghRed/20 bg-ghRed/5 p-5">
      <style>{`
        @keyframes rdh-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .rdh-marquee-track { animation: rdh-marquee 22s linear infinite; }
        .rdh-marquee-track:hover { animation-play-state: paused; }
      `}</style>
      <p className="text-sm font-semibold text-ink">
        Our data bundles don&rsquo;t support the following:
      </p>
      <div style={{ overflow: "hidden" }} className="mt-3">
        <div className="rdh-marquee-track" style={{ display: "flex", width: "max-content", gap: "0.5rem" }}>
          {track.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="whitespace-nowrap rounded-full border border-ghRed/20 bg-white px-3 py-1 text-xs font-medium text-ink/70"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-ink/50">
        Orders sent to any of the above will fail to deliver — double-check your SIM type and
        number before paying. Refunds for these cases are handled case-by-case; contact support
        via WhatsApp if this happens to you.
      </p>
    </div>
  );
}
