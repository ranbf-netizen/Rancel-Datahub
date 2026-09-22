import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

// Low-level text generation.
export async function generateText(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: MODEL });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Result type the AI routes return to the client so it can react (e.g. show a
// "buy credits" prompt when out).
export type AiToolResult =
  | { ok: true; result: string; creditsLeft: number }
  | { ok: false; reason: "AUTH"; }
  | { ok: false; reason: "NO_CREDITS"; };

// Credit-aware runner used by every AI tool route:
// - requires login (guests get reason AUTH → client shows sign-up prompt)
// - requires >=1 credit (else NO_CREDITS → client shows buy prompt)
// - deducts exactly 1 credit, then generates
export async function runAiTool(prompt: string): Promise<AiToolResult> {
  const session = getSession();
  if (!session) return { ok: false, reason: "AUTH" };

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { aiCredits: true } });
  if (!user || user.aiCredits < 1) return { ok: false, reason: "NO_CREDITS" };

  // Deduct first (atomic) so a burst of requests can't over-spend.
  const updated = await prisma.user.update({
    where: { id: session.userId },
    data: { aiCredits: { decrement: 1 } },
    select: { aiCredits: true },
  });

  try {
    const result = await generateText(prompt);
    return { ok: true, result, creditsLeft: updated.aiCredits };
  } catch (err) {
    // Generation failed — refund the credit so the user isn't charged for nothing.
    await prisma.user.update({ where: { id: session.userId }, data: { aiCredits: { increment: 1 } } });
    throw err;
  }
}
