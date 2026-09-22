import { NextResponse } from "next/server";
import { runAiTool } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, contact, experience, education, skills } = body;
    if (!name || !contact) return NextResponse.json({ error: "Name and contact are required." }, { status: 400 });
    const out = await runAiTool(`Write a clean, professional CV. Use clear sections with headings (Professional Summary, Work Experience, Education, Skills). Concise, well-formatted.
Name: ${name}
Contact: ${contact}
Work Experience: ${experience || "Not provided"}
Education: ${education || "Not provided"}
Skills: ${skills || "Not provided"}`);
    if (!out.ok) {
      const status = out.reason === "AUTH" ? 401 : 402;
      return NextResponse.json({ error: out.reason }, { status });
    }
    return NextResponse.json({ result: out.result, creditsLeft: out.creditsLeft });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
