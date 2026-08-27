import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Cledanet has no catalog/packages endpoint - bundles are entered manually by
// admin (Option A), unlike the previous suppliers where "Sync catalog" pulled
// sizes/prices automatically. Admin must know Cledanet's supported sizes and
// cost prices from their own rate sheet/dashboard and enter them here.

function requireAdmin() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

// The ONLY network values Cledanet accepts. Bundles are sent to Cledanet using
// this exact string (see fulfillment.ts -> placeOrder), and the customer /data
// page matches on it case-sensitively, so anything outside this set silently
// breaks both display and fulfillment. Enforce it here so a bad value can never
// reach the database, regardless of how the request was made.
const VALID_NETWORKS = ["MTN", "TELECEL", "AIRTELTIGO_ISHARE", "AIRTELTIGO_BIGTIME"];

// GET: list all bundles (admin view, includes cost + margin)
export async function GET() {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const bundles = await prisma.dataBundle.findMany({ orderBy: [{ network: "asc" }, { dataSizeGb: "asc" }] });
  return NextResponse.json(bundles);
}

// POST: manually add a single bundle (network + size + cost + selling price).
export async function POST(req: NextRequest) {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { network, dataSizeGb, costPrice, sellingPrice, validityDays } = await req.json();

  if (!network || !dataSizeGb || costPrice === undefined || sellingPrice === undefined) {
    return NextResponse.json(
      { error: "Network, size, cost price, and selling price are all required." },
      { status: 400 }
    );
  }

  if (!VALID_NETWORKS.includes(network)) {
    return NextResponse.json(
      { error: `Network must be exactly one of: ${VALID_NETWORKS.join(", ")}.` },
      { status: 400 }
    );
  }

  const existing = await prisma.dataBundle.findFirst({ where: { network, dataSizeGb: Number(dataSizeGb) } });
  if (existing) {
    return NextResponse.json({ error: "A bundle for this network and size already exists - edit it instead." }, { status: 409 });
  }

  const bundle = await prisma.dataBundle.create({
    data: {
      network,
      label: String(dataSizeGb),
      dataSizeGb: Number(dataSizeGb),
      supplierPackageId: String(dataSizeGb), // Cledanet has no separate ID - size IS the identity
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      validityDays: validityDays ? Number(validityDays) : 30,
    },
  });

  return NextResponse.json(bundle);
}

// PATCH: update a single bundle's cost price, selling price, validity, or active status.
// Cost price is now editable here too, since there's no live sync to refresh it from.
export async function PATCH(req: NextRequest) {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, costPrice, sellingPrice, validityDays, active } = await req.json();

  const bundle = await prisma.dataBundle.update({
    where: { id },
    data: {
      ...(costPrice !== undefined ? { costPrice: Number(costPrice) } : {}),
      ...(sellingPrice !== undefined ? { sellingPrice: Number(sellingPrice) } : {}),
      ...(validityDays !== undefined ? { validityDays: Number(validityDays) } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });

  return NextResponse.json(bundle);
}

// DELETE: remove a bundle entirely (e.g. a size Cledanet no longer offers).
export async function DELETE(req: NextRequest) {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await req.json();
  await prisma.dataBundle.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
