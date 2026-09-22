import AiTool from "../AiTool";
export default function Page() {
  return <AiTool title="Business Name Generator" description="Catchy, brandable name ideas for your business." endpoint="/api/business-name" buttonLabel="Generate Names"
    fields={[
      { name: "industry", label: "What's the business?", placeholder: "e.g. data & airtime reseller" },
      { name: "keywords", label: "Keywords to include (optional)", placeholder: "e.g. fast, data" },
      { name: "style", label: "Style", type: "select", options: ["Modern", "Professional", "Fun & catchy", "Premium / luxury"] },
    ]} />;
}
