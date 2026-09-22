import AiTool from "../AiTool";
export default function Page() {
  return <AiTool title="Product Description Generator" description="Turn product details into copy that sells." endpoint="/api/product-description" buttonLabel="Generate Description"
    fields={[
      { name: "product", label: "Product name", placeholder: "e.g. Classic wristwatch" },
      { name: "features", label: "Key features / details", type: "textarea", rows: 3, placeholder: "e.g. waterproof, leather strap" },
      { name: "tone", label: "Tone", type: "select", options: ["Persuasive", "Luxury", "Fun & catchy", "Simple & clear"] },
    ]} />;
}
