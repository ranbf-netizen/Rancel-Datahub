import AiTool from "../AiTool";
export default function Page() {
  return <AiTool title="Business Description Generator" description="A polished description for your website or bio." endpoint="/api/business-description" buttonLabel="Generate Description"
    fields={[
      { name: "business", label: "Business name or type", placeholder: "e.g. Rancel DataHub" },
      { name: "offerings", label: "What do you offer?", type: "textarea", rows: 3, placeholder: "e.g. data bundles, airtime, results checkers" },
      { name: "tone", label: "Tone", type: "select", options: ["Professional", "Friendly", "Premium / luxury", "Bold & energetic"] },
    ]} />;
}
