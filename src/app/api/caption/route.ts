import { NextResponse } from "next/server";
import { runAiTool } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, platform, tone } = body;
    if (!topic) return NextResponse.json({ error: "Please enter what the post is about." }, { status: 400 });
    const out = await runAiTool(`Write 5 engaging social media captions for a Ghanaian audience. Emojis and a few hashtags each. Number them. Topic: ${topic}. Platform: ${platform || "Instagram"}. Tone: ${tone || "engaging"}.`);
    if (!out.ok) {
      const status = out.reason === "AUTH" ? 401 : 402;
      return NextResponse.json({ error: out.reason }, { status });
    }
    return NextResponse.json({ result: out.result, creditsLeft: out.creditsLeft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
