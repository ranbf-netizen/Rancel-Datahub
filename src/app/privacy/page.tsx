export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Legal</p>
      <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate">Last updated: August 27, 2026</p>

      <p className="mt-4 text-sm text-slate">
  At RanCel DataHub, we respect your privacy and are committed to protecting your
  personal information. This Privacy Policy explains how we collect, use, store,
  and protect your data when you use our website and services. By accessing or
  using our platform, you agree to the practices described in this policy.
</p>

      <div className="mt-6 space-y-6 text-sm text-slate">
        <section>
          <h2 className="text-base font-semibold text-ink">Who we are</h2>
          <p className="mt-2">
            RanCel DataHub (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates this website, which sells
            mobile data bundles, WAEC/BECE results checker PINs, and AFA registrations to customers
            in Ghana. For the purposes of the Data Protection Act, 2012 (Act 843), the data
            controller is RanCel DataHub. This policy explains what personal data we collect, why,
            how we use it, and the rights you have over it.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Information we collect</h2>
          <p className="mt-2">We only collect what we need to provide the service you request:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><span className="font-medium text-ink">For any order:</span> the phone number the
              product is for, and a contact phone number for tracking your order.</li>
            <li><span className="font-medium text-ink">If you create an account:</span> your name,
              email address, and phone number, plus a securely hashed version of your password (we
              never store your password in readable form).</li>
            <li><span className="font-medium text-ink">For AFA registration:</span> your full name,
              phone number, ID number (e.g. Ghana Card or voter ID), date of birth, town, region,
              occupation, and optionally your crop/produce. This is required to submit your
              registration to our registration partner.</li>
            <li><span className="font-medium text-ink">Payment information:</span> handled entirely
              by Paystack. We do not see or store your card or mobile money details &mdash; we only
              receive a payment reference and confirmation of whether payment succeeded.</li>
            <li><span className="font-medium text-ink">Technical data:</span> a session cookie to
              keep you logged in, and standard server logs (such as IP address and request times)
              used for security and troubleshooting.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">How we use your information</h2>
          <p className="mt-2">
            We use your data to process and fulfil your orders, deliver data bundles and PINs, submit
            AFA registrations, confirm payments, let you track orders, provide customer support,
            keep records for accounting, and prevent fraud or abuse. We do not use your personal
            data for automated decisions that produce legal effects about you.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Who we share it with</h2>
          <p className="mt-2">
            We share only what is necessary to complete your order: the recipient number and bundle
            details with our data supplier (Cledanet); your AFA registration details with our
            registration partner; and payment details directly between you and Paystack. These
            providers process this data to deliver the service and are expected to protect it. We do
            not sell your personal information to anyone. We may disclose data where required by law
            or to protect our legal rights.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">How long we keep it</h2>
          <p className="mt-2">
            We keep order and transaction records for as long as needed to provide support and to
            meet accounting and legal obligations. Account data is kept while your account is active.
            You can ask us to delete data we are not legally required to retain.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Your rights</h2>
          <p className="mt-2">
            Under the Data Protection Act, 2012 you have the right to access the personal data we
            hold about you, to correct inaccurate data, to ask us to stop processing or to delete
            your data in certain circumstances, and to complain to the Data Protection Commission of
            Ghana. To exercise any of these, reach us through our{" "}
            <a href="/contact" className="text-primary hover:underline">Contact</a> page and we will
            respond within a reasonable time.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Security</h2>
          <p className="mt-2">
            We take reasonable technical measures to protect your data &mdash; passwords are hashed,
            payment details never touch our servers, and access is limited. No system is perfectly
            secure, but we work to reduce risk and to respond quickly if a problem arises.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Changes and contact</h2>
          <p className="mt-2">
            We may update this policy from time to time; the &ldquo;last updated&rdquo; date above
            shows when. For any question about your data or this policy, reach us through the{" "}
            <a href="/contact" className="text-primary hover:underline">Contact</a> page.
          </p>
        </section>
      </div>
    </div>
  );
}