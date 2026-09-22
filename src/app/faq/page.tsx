import FAQAccordion from "../components/FAQAccordion";

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">FAQ</p>
      <h1 className="mt-2 text-3xl font-bold">Frequently asked questions</h1>
      <div className="mt-6">
        <FAQAccordion />
      </div>
    </div>
  );
}
