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
  return (
    <div className="rounded-2xl border border-ghRed/20 bg-ghRed/5 p-5">
      <p className="text-sm font-semibold text-ink">
        Our data bundles don't support the following:
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {UNSUPPORTED.map((item) => (
          <span
            key={item}
            className="rounded-full border border-ghRed/20 bg-white px-3 py-1 text-xs font-medium text-ink/70"
          >
            {item}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink/50">
        Orders sent to any of the above will fail to deliver — double-check your SIM type and
        number before paying. Refunds for these cases are handled case-by-case; contact support
        via WhatsApp if this happens to you.
      </p>
    </div>
  );
}
