export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Legal</p>
      <h1 className="mt-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-4 rounded-xl border border-ghRed/20 bg-ghRed/5 p-4 text-sm text-ink/70">
        This is placeholder text, not a reviewed legal document. Replace this page with real
        privacy terms — ideally reviewed by a lawyer familiar with Ghanaian data protection law
        (the Data Protection Act, 2012) — before relying on it with real customers.
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
