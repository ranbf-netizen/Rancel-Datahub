import AiTool from "../AiTool";
export default function Page() {
  return <AiTool title="Social Media Caption Generator" description="Captions with emojis and hashtags." endpoint="/api/caption" buttonLabel="Generate Captions"
    fields={[
      { name: "topic", label: "What's the post about?", type: "textarea", rows: 2, placeholder: "e.g. weekend data promo" },
      { name: "platform", label: "Platform", type: "select", options: ["Instagram", "Facebook", "TikTok", "WhatsApp Status", "X (Twitter)"] },
      { name: "tone", label: "Tone", type: "select", options: ["Engaging", "Professional", "Funny", "Inspirational"] },
    ]} />;
}
