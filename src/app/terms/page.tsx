export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Legal</p>
      <h1 className="mt-2 text-3xl font-bold">Terms & Conditions</h1>
      <p className="mt-4 rounded-xl border border-ghRed/20 bg-ghRed/5 p-4 text-sm text-ink/70">
        This is placeholder text, not a reviewed legal document. Replace this page with real terms
        — ideally reviewed by a lawyer — before relying on it with real customers.
      </p>
      <div className="mt-6 space-y-4 text-sm text-slate">
        <p>By placing an order, you agree to pay the listed price for the data bundle or results
        checker PIN selected, and to provide an accurate recipient number.</p>
        <p>Orders cannot be fulfilled to Turbonet SIM, Merchant SIM, EVD SIM, Broadband SIM,
        blacklisted SIM, roaming SIM, a different network than selected, a wrong number, or an
        inactive number. Fulfillment failures caused by these are handled case-by-case.</p>
        <p>Refunds are issued when payment succeeds but fulfillment genuinely fails on our end.
        Contact us via WhatsApp with your order reference for any dispute.</p>
        <p>Agents reselling through the platform are responsible for their own pricing and customer
        relationships; RanCel DataHub is not a party to the sale between an agent and their customer.</p>
      </div>
    </div>
  );
}
