import { NextResponse } from "next/server";
import { runAiTool } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { business, offerings, tone } = body;
    if (!business) return NextResponse.json({ error: "Please enter your business name or type." }, { status: 400 });
    const out = await runAiTool(`Write a compelling business description (about 3 short paragraphs) for a Ghanaian business. Business: ${business}. Offers: ${offerings || "not specified"}. Tone: ${tone || "professional"}.`);
    if (!out.ok) {
      const status = out.reason === "AUTH" ? 401 : 402;
      return NextResponse.json({ error: out.reason }, { status });
    }
    return NextResponse.json({ result: out.result, creditsLeft: out.creditsLeft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
