const STORE_URL = "https://ranceldatahub.checkerport.com";

const OPTIONS = [
  {
    heading: "Buy result checkers",
    blurb: "Purchase a BECE or WASSCE checker voucher. Pay with Mobile Money and get your voucher instantly by SMS.",
    items: ["BECE checker voucher", "WASSCE checker voucher"],
  },
  {
    heading: "Check results instantly",
    blurb: "Enter an index number, pay with Mobile Money, and get the result plus a PDF download link right away.",
    items: ["BECE result", "WASSCE (School)", "WASSCE (Private)", "SHS Placement"],
  },
];

export default function ResultsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Results Checker</p>
      <h1 className="mt-1 text-3xl font-bold">WAEC Vouchers & Result Checking</h1>
      <p className="mt-2 text-slate">
        Buy BECE/WASSCE checker vouchers or check results instantly. Payment is by Mobile Money and
        your voucher or result is delivered by SMS (and a PDF link for results). No account needed.
      </p>

      <div className="mt-8 space-y-4">
        {OPTIONS.map((o) => (
          <div key={o.heading} className="card">
            <h2 className="text-lg font-semibold">{o.heading}</h2>
            <p className="mt-1 text-sm text-slate">{o.blurb}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {o.items.map((it) => (
                <li key={it} className="rounded-full bg-mist px-3 py-1 text-xs font-medium text-ink/70">{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <a
        href={STORE_URL}
        className="btn-primary mt-8 flex w-full items-center justify-center"
      >
        Continue to Buy / Check Results
      </a>
      <p className="mt-3 text-center text-xs text-slate">
        You&rsquo;ll be taken to our secure checker portal to complete your purchase.
      </p>

      <div className="mt-6 rounded-xl border border-ink/10 bg-mist/50 p-4 text-sm text-ink/70">
        <p className="font-medium text-ink">Prefer USSD?</p>
        <p className="mt-1">
          Dial <span className="font-semibold">*714*123#</span> on any phone and enter agent code{" "}
          <span className="font-semibold">1962</span> to buy or check without internet.
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-slate">
        Didn&rsquo;t get your checker after paying?{" "}
        <a href={STORE_URL} className="text-primary hover:underline">
          Retrieve it here
        </a>.
      </p>
    </div>
  );
}
