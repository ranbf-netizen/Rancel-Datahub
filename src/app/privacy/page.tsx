export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Legal</p>
      <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate">Last updated: October 9, 2026.</p>

      <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-ink/70">
  This Privacy Policy explains how Rancel DataHub collects, uses, stores, and protects
  your personal information when you use our website and services. By using Rancel
  DataHub, you acknowledge and agree to the practices described in this policy. We
  handle personal information in accordance with applicable data protection laws of
  Ghana, including the Data Protection Act, 2012 (Act 843).
</p>

      <div className="mt-6 space-y-6 text-sm text-slate">
        <section>
          <h2 className="text-base font-semibold text-ink">Who we are</h2>
          <p className="mt-2">
            RanCel DataHub (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates this website, which sells
            mobile data bundles, WAEC/BECE results checker PINs, AFA registrations, digital
            products (including streaming and subscription access), social media growth
            (&ldquo;boosting&rdquo;) services, and rented phone numbers for SMS verification. For the
            purposes of the Data Protection Act, 2012 (Act 843), the data controller is RANCEL
            DATAHUB. This policy explains what personal data
            we collect, why, how we use it, and the rights you have over it.
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
            <li><span className="font-medium text-ink">For social media boosting orders:</span> the
              link or username of the content/account you want us to grow, and the quantity of the
              service you&rsquo;ve purchased (e.g. followers, likes, views).</li>
            <li><span className="font-medium text-ink">For SMS number rentals:</span> the service and
              country you selected, and the verification code received on the rented number, which we
              display back to you so you can complete your own sign-up or verification elsewhere. We
              do not retain the rented number or code beyond what&rsquo;s needed to show it to you and
              keep a record of the order.</li>
            <li><span className="font-medium text-ink">For certain digital products:</span> some
              products are delivered by briefly checking our own business inbox for a newly arrived
              code (for example, a one-time sign-in code for a shared subscription) after you confirm
              you&rsquo;ve requested one. This only ever reads our own inbox, never yours, and only
              shows you the specific code, not any other email content.</li>
            <li><span className="font-medium text-ink">Wallet balances:</span> if you use a wallet
              feature (such as for SMS number rentals), we keep a record of your deposits, balance,
              and transaction history so orders and refunds can be tracked accurately.</li>
            <li><span className="font-medium text-ink">If you apply to become an agent/reseller:</span>{" "}
              your application details, and, if approved, payout details (such as mobile money
              number) used to pay out your earnings or withdrawals.</li>
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
            AFA registrations, place and track social media boosting orders, rent and deliver SMS
            verification numbers and codes, deliver other digital products you purchase, maintain any
            wallet balance and its transaction history, confirm payments, let you track orders,
            provide customer support, keep records for accounting, administer the agent/reseller
            program, and prevent fraud or abuse. We do not use your personal data for automated
            decisions that produce legal effects about you.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Who we share it with</h2>
          <p className="mt-2">
            We share only what is necessary to complete your order: the recipient number and bundle
            details with our data supplier (Cledanet); your AFA registration details with our
            registration partner; the link/username and quantity for boosting orders with our social
            media growth panel; the service and country selected for SMS rentals with our SMS number
            provider (SMSPool); and payment details directly between you and Paystack. These providers
            process this data to deliver the service and are expected to protect it. We do not sell
            your personal information to anyone. We may disclose data where required by law or to
            protect our legal rights.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">How long we keep it</h2>
          <p className="mt-2">
            We keep order and transaction records for as long as needed to provide support and to
            meet accounting and legal obligations. Account data, wallet balances, and transaction
            history are kept while your account is active. You can ask us to delete data we are not
            legally required to retain.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Your rights</h2>
          <p className="mt-2">
            Under the Data Protection Act, 2012 you have the right to access the personal data we
            hold about you, to correct inaccurate data, to ask us to stop processing or to delete
            your data in certain circumstances, and to complain to the Data Protection Commission of
            Ghana. To exercise any of these, contact us at <a href="/contact" className="text-primary hover:underline">Contact Page</a> and we will respond within
            a reasonable time.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Security</h2>
          <p className="mt-2">
            We take reasonable technical measures to protect your data &mdash; passwords are hashed,
            payment details never touch our servers, access is limited, and sensitive integrations
            (such as our inbox-checking delivery method) are scoped to read only what&rsquo;s needed
            to complete your order. No system is perfectly secure, but we work to reduce risk and to
            respond quickly if a problem arises.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink">Changes and contact</h2>
          <p className="mt-2">
            We may update this policy from time to time; the &ldquo;last updated&rdquo; date above
            shows when. For any question about your data or this policy, reach us through the{" "}
            <a href="/contact" className="text-primary hover:underline">Contact</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
