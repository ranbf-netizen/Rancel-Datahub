export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Legal</p>
      <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-4 rounded-xl border border-ghRed/20 bg-ghRed/5 p-4 text-sm text-ink/70">
        We respect your privacy and are committed to protecting your personal information. Any information you provide through this platform, including your name, email address, phone number, payment details, and other account information, will be collected and used solely for the purpose of providing and improving our services.
We do not sell or share your personal information with unauthorized third parties. Information may be shared with trusted service providers where necessary to process payments, deliver services, comply with legal obligations, or maintain platform functionality.
We implement reasonable security measures to protect your data from unauthorized access, disclosure, alteration, or destruction. However, no internet-based service can guarantee absolute security.
Users have the right to request access to, correction of, or deletion of their personal information, subject to applicable legal requirements.
This platform aims to comply with the Data Protection Act, 2012 (Act 843) of Ghana. By using our services, you consent to the collection and use of your information as described in this Privacy Policy.
For any questions regarding privacy or data protection, please contact us through the contact information provided on this platform.

      </p>
      <div className="mt-6 space-y-4 text-sm text-slate">
        <p>We collect the information needed to process your order: your phone number, and if you
        create an account, your name and email address. Guest orders are looked up only by exact
        reference or phone number.</p>
        <p>Payment is processed by Paystack; we don't store your card or mobile money details
        ourselves. Order and transaction records are kept for accounting and support purposes.</p>
        <p>We don't sell your information to third parties. Questions about your data — contact us
        via the Contact page.</p>
      </div>
    </div>
  );
}
