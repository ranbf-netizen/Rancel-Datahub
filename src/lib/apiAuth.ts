import { prisma } from "@/lib/db";

// Authenticates a reseller API request by its API key (sent as
// "Authorization: Bearer <key>" or "x-api-key: <key>"). Returns the agent
// profile the key belongs to, or null if invalid/inactive.
export async function authenticateApiKey(req: Request) {
  const auth = req.headers.get("authorization");
  const headerKey = req.headers.get("x-api-key");
  let key = headerKey || "";
  if (!key && auth && auth.startsWith("Bearer ")) {
    key = auth.slice(7).trim();
  }
  if (!key) return null;

  const record = await prisma.apiKey.findUnique({
    where: { key },
    include: { agent: true },
  });
  if (!record || !record.active) return null;
  if (record.agent.status !== "APPROVED") return null; // only approved agents

  // best-effort last-used timestamp
  prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } }).catch(() => {});

  return record.agent;
}