export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Legal</p>
      <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate">Last updated: 1st September, 2026</p>

      <      <p className="mt-4 rounded-xl border border-ink/10 bg-mist/50 p-4 text-sm text-ink/70">
        Your privacy matters to us. This policy explains what information RanCel DataHub collects,
        how we use and protect it, and the rights you have over your data under Ghana&rsquo;s Data
        Protection Act, 2012.
      </p>

      <div className="mt-6 space-y-6 text-sm text-slate">
        <section>
          <h2 className="text-base font-semibold text-ink">Who we are</h2>
          <p className="mt-2">
            RanCel DataHub sells data bundles, results checker vouchers, and AFA registrations in
            Ghana. Under the Data Protection Act, 2012 (Act 843), RanCel DataHub is the data
            controller for the information described below.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">What we collect</h2>
          <p className="mt-2">
            Only what&rsquo;s needed to serve you: the recipient and contact phone numbers for an
            order; your name, email and phone (and a hashed password) if you create an account; and
            for AFA, your name, ID number, date of birth, town, region and occupation. Payments are
            handled by Paystack &mdash; we never see or store your card or mobile-money details. We
            also keep a login cookie and standard server logs.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">How we use and share it</h2>
          <p className="mt-2">
            We use your data to process orders, deliver products, confirm payments, support you, and
            prevent fraud. We share only what&rsquo;s needed to complete an order &mdash; with our
            data supplier, our AFA partner, and Paystack. We never sell your data, and disclose it
            only where the law requires.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Your rights &amp; retention</h2>
          <p className="mt-2">
            You may access, correct or delete your data, or complain to the Data Protection
            Commission of Ghana. We keep order records as long as needed for support and legal
            obligations. To make any request, reach us via our{" "}
            <a href="/contact" className="text-primary hover:underline">Contact</a> page.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Changes</h2>
          <p className="mt-2">
            We may update this policy; the date above shows when. Questions? Use our{" "}
            <a href="/contact" className="text-primary hover:underline">Contact</a> page.
          </p>
        </section>
      </div>
    </div>
  );
}