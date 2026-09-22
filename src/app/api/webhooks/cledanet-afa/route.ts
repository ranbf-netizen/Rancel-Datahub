import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Unlike the data-order webhook, there's no documented GET-by-id endpoint for
// AFA registrations to re-verify against - so this stores whatever status
// Cledanet's callback reports directly, best-effort. If a registration seems
// stuck, check Cledanet's own dashboard directly as the ultimate source of truth.
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supplierId = body?.id || body?.payload?.id;
  const status = body?.status || body?.payload?.status;
  if (!supplierId || !status) {
    return NextResponse.json({ received: true, note: "No id/status found in callback body" });
  }

  await prisma.afaOrder.updateMany({
    where: { supplierId },
    data: { supplierStatus: String(status) },
  });

  return NextResponse.json({ received: true });
}
