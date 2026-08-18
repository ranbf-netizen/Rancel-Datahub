import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getPackages, SupplierNetwork } from "@/lib/supplier";

const NETWORKS: SupplierNetwork[] = ["mtn", "telecel", "airteltigo"];

// Sync used to run each network sequentially, each with a for-loop of one-at-a-time
// DB writes - slow enough with many packages to hit Vercel's function timeout,
// which left the frontend button stuck forever with no error shown. Raising the
// max duration and parallelizing the read step below fixes both the timeout risk
// and (combined with the frontend fix) guarantees the button never hangs silently.
export const maxDuration = 60;

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

async function syncOnePackage(network: SupplierNetwork, pkg: { package_id: number | string; label: string; price: number; data_size: number }) {
  const existing = await prisma.dataBundle.findFirst({
    where: { network, dataSizeGb: pkg.data_size },
  });

  if (existing) {
    await prisma.dataBundle.update({
      where: { id: existing.id },
      data: {
        costPrice: pkg.price,
        label: pkg.label,
        supplierPackageId: String(pkg.package_id), // keep this in sync with mydatagigs
      },
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

// POST: sync catalog from supplier (creates new bundles, updates cost prices).
// Matches existing bundles by network + data size (a stable identity from the
// customer's point of view), NOT by supplierPackageId - suppliers occasionally
// rotate their internal package IDs for the same size, and matching on the ID
// itself would silently create a duplicate stale row instead of updating the
// live one, leaving a dead ID purchasable until someone notices.
// Selling price defaults to cost + 10% on first import; admin can edit afterwards via PATCH.
export async function POST() {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const results: Record<string, number> = {};

  try {
    // Fetching all networks' catalogs in parallel is safe (read-only, no DB writes).
    const perNetworkPackages = await Promise.all(
      NETWORKS.map(async (network) => ({ network, packages: await getPackages(network) }))
    );

    for (const { network, packages } of perNetworkPackages) {
      // Writes must run one at a time, NOT in parallel: if the supplier's catalog
      // has two different packages reporting the same data_size for one network
      // (e.g. a plain "1GB" and a "1GB + bonus" both sized 1), parallel writes can
      // both check "does this exist?" at the same instant, both see no, and both
      // try to create it - the second collides with the unique constraint and
      // crashes. Sequential writes make each one see the previous one's result.
      for (const pkg of packages) {
        await syncOnePackage(network, pkg);
      }
      results[network] = packages.length;
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `Sync failed: ${err.message || "unknown error"}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ synced: results });
}

// PATCH: update a single bundle's selling price / validity / active status
export async function PATCH(req: NextRequest) {
  if (!requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, sellingPrice, validityDays, active } = await req.json();

  const bundle = await prisma.dataBundle.update({
    where: { id },
    data: {
      ...(sellingPrice !== undefined ? { sellingPrice } : {}),
      ...(validityDays !== undefined ? { validityDays } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });

  return NextResponse.json(bundle);
}
