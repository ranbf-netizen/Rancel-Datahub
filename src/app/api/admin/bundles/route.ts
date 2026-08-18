import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getPackages, SupplierNetwork } from "@/lib/supplier";

const NETWORKS: SupplierNetwork[] = ["mtn", "telecel", "at_bigdata", "at_ishare"];

function requireAdmin() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") return null;
  return session;
}

// GET: list all bundles (admin view, includes cost + margin)
export async function GET() {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const bundles = await prisma.dataBundle.findMany({ orderBy: [{ network: "asc" }, { dataSizeGb: "asc" }] });
  return NextResponse.json(bundles);
}

// POST: sync catalog from supplier (creates new bundles, updates cost prices).
// Selling price defaults to cost + 10% on first import; admin can edit afterwards via PATCH.
export async function POST() {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const results: Record<string, number> = {};

  for (const network of NETWORKS) {
    const packages = await getPackages(network);
    for (const pkg of packages) {
      const existing = await prisma.dataBundle.findUnique({
        where: { network_supplierPackageId: { network, supplierPackageId: String(pkg.package_id) } },
      });

      if (existing) {
        await prisma.dataBundle.update({
          where: { id: existing.id },
          data: { costPrice: pkg.price, label: pkg.label, dataSizeGb: pkg.data_size },
        });
      } else {
        await prisma.dataBundle.create({
          data: {
            network,
            label: pkg.label,
            dataSizeGb: pkg.data_size,
            supplierPackageId: String(pkg.package_id),
            costPrice: pkg.price,
            sellingPrice: Math.ceil(pkg.price * 1.1 * 100) / 100, // default 10% markup
          },
        });
      }
    }
    results[network] = packages.length;
  }

  return NextResponse.json({ synced: results });
}

// PATCH: update a single bundle's selling price / active status
export async function PATCH(req: NextRequest) {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, sellingPrice, active } = await req.json();

  const bundle = await prisma.dataBundle.update({
    where: { id },
    data: {
      ...(sellingPrice !== undefined ? { sellingPrice } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });

  return NextResponse.json(bundle);
}
