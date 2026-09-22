import { NextResponse } from "next/server";
import { runAiTool } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product, features, tone } = body;
    if (!product) return NextResponse.json({ error: "Please enter the product name." }, { status: 400 });
    const out = await runAiTool(`Write a persuasive product description for a Ghanaian online seller. Catchy intro, benefit bullets, closing call to action. Product: ${product}. Features: ${features || "not specified"}. Tone: ${tone || "persuasive"}.`);
    if (!out.ok) {
      const status = out.reason === "AUTH" ? 401 : 402;
      return NextResponse.json({ error: out.reason }, { status });
    }
    return NextResponse.json({ result: out.result, creditsLeft: out.creditsLeft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
