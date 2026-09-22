import { NextResponse } from "next/server";
import { runAiTool } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product, price, contact, tone } = body;
    if (!product) return NextResponse.json({ error: "Please enter what you're advertising." }, { status: 400 });
    const out = await runAiTool(`Write a short, punchy WhatsApp advert for a Ghanaian audience. Tasteful emojis, line breaks, clear call to action. Ready to post.
Product/Service: ${product}
Price: ${price || "not specified"}
Contact: ${contact || "not specified"}
Tone: ${tone || "friendly and persuasive"}`);
    if (!out.ok) {
      const status = out.reason === "AUTH" ? 401 : 402;
      return NextResponse.json({ error: out.reason }, { status });
    }
    return NextResponse.json({ result: out.result, creditsLeft: out.creditsLeft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
