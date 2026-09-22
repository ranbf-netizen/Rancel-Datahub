import { NextResponse } from "next/server";
import { runAiTool } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { service, client, details } = body;
    if (!service) return NextResponse.json({ error: "Please enter the service you're proposing." }, { status: 400 });
    const out = await runAiTool(`Write a clear, professional business proposal with sections (Introduction, Scope of Work, Timeline, Pricing note, Closing). Service: ${service}. Client: ${client || "the client"}. Extra details: ${details || "none"}.`);
    if (!out.ok) {
      const status = out.reason === "AUTH" ? 401 : 402;
      return NextResponse.json({ error: out.reason }, { status });
    }
    return NextResponse.json({ result: out.result, creditsLeft: out.creditsLeft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
