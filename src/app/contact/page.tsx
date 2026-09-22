export default function ContactPage() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "233000000000";
  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">Contact</p>
      <h1 className="mt-2 text-3xl font-bold">Get in touch</h1>
      <p className="mt-4 text-slate">
        The fastest way to reach us is WhatsApp — most questions get answered within a few
        minutes during business hours.
      </p>
      <div className="mt-6 space-y-3">
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary w-full !bg-[#25D366] hover:!bg-[#1ebe57]"
        >
          Chat on WhatsApp
        </a>
        <a href="/track" className="btn-secondary w-full">
          Track an existing order
        </a>
      </div>
      <p className="mt-6 text-xs text-slate">Support hours: Mon–Sat, 8am–8pm.</p>
    </div>
  );
}
