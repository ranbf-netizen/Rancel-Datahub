import { NextResponse } from "next/server";
import { runAiTool } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { industry, keywords, style } = body;
    if (!industry) return NextResponse.json({ error: "Please describe your business or industry." }, { status: 400 });
    const out = await runAiTool(`Generate 12 catchy, brandable business name ideas for a Ghanaian business. For each, name in bold then a short reason. Industry: ${industry}. Keywords: ${keywords || "none"}. Style: ${style || "modern"}.`);
    if (!out.ok) {
      const status = out.reason === "AUTH" ? 401 : 402;
      return NextResponse.json({ error: out.reason }, { status });
    }
    return NextResponse.json({ result: out.result, creditsLeft: out.creditsLeft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
