import AiTool from "../AiTool";
export default function Page() {
  return <AiTool title="WhatsApp Advert Generator" description="Turn a product and price into a ready-to-post WhatsApp advert." endpoint="/api/advert" buttonLabel="Generate Advert"
    fields={[
      { name: "product", label: "What are you selling?", placeholder: "e.g. 5GB MTN data bundle" },
      { name: "price", label: "Price", placeholder: "e.g. GH₵ 22" },
      { name: "contact", label: "Contact / how to order", placeholder: "e.g. WhatsApp 024..." },
      { name: "tone", label: "Tone", type: "select", options: ["Friendly & persuasive", "Urgent / limited offer", "Professional", "Fun & catchy"] },
    ]} />;
}
