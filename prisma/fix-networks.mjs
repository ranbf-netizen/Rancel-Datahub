// ---------------------------------------------------------------------------
// One-off fix: normalize legacy lowercase DataBundle.network values to the
// exact codes the buying page and Cledanet require.
//
//   mtn        -> MTN
//   telecel    -> TELECEL
//   airteltigo -> AIRTELTIGO_ISHARE   (you chose: all AirtelTigo = iShare)
//
// Runs THROUGH Prisma Accelerate using the DATABASE_URL already in your .env,
// so you don't need a separate direct database connection.
//
// HOW TO RUN (from the project root, i.e. the rancel-datahub folder):
//     node prisma/fix-networks.mjs
//
// It's safe to run more than once — after the first run there are simply no
// lowercase rows left to change.
// ---------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

// --- load DATABASE_URL from .env without needing the dotenv package ---------
function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // no .env file — rely on whatever is already in the environment
  }
}
loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Make sure you're running this from the project root and .env exists.");
  process.exit(1);
}

const prisma = new PrismaClient().$extends(withAccelerate());

async function distribution(label) {
  const rows = await prisma.dataBundle.groupBy({
    by: ["network"],
    _count: { _all: true },
  });
  console.log(`\n${label}`);
  for (const r of rows.sort((a, b) => a.network.localeCompare(b.network))) {
    console.log(`   ${r.network.padEnd(20)} ${r._count._all}`);
  }
}

async function main() {
  await distribution("Before:");

  const mtn = await prisma.$executeRawUnsafe(
    `UPDATE "DataBundle" SET network = 'MTN' WHERE lower(btrim(network)) = 'mtn' AND network <> 'MTN'`
  );
  const telecel = await prisma.$executeRawUnsafe(
    `UPDATE "DataBundle" SET network = 'TELECEL' WHERE lower(btrim(network)) = 'telecel' AND network <> 'TELECEL'`
  );
  const airtel = await prisma.$executeRawUnsafe(
    `UPDATE "DataBundle" SET network = 'AIRTELTIGO_ISHARE' WHERE lower(btrim(network)) = 'airteltigo' AND network <> 'AIRTELTIGO_ISHARE'`
  );

  console.log(`\nRows updated:  MTN ${mtn}   TELECEL ${telecel}   AIRTELTIGO_ISHARE ${airtel}`);

  await distribution("After:");

  // Warn if anything is still not one of the four valid codes.
  const valid = ["MTN", "TELECEL", "AIRTELTIGO_ISHARE", "AIRTELTIGO_BIGTIME"];
  const leftovers = await prisma.dataBundle.findMany({
    where: { NOT: { network: { in: valid } } },
    select: { id: true, network: true },
  });
  if (leftovers.length) {
    console.log(`\n⚠  ${leftovers.length} row(s) still have an unrecognized network value:`);
    for (const l of leftovers) console.log(`   ${l.id}  ->  "${l.network}"`);
    console.log("   These won't show on the buying side. Fix them before selling.");
  } else {
    console.log("\n✓ All bundles now use a valid network code. They will show on the buying side.");
  }
}

main()
  .catch((e) => {
    console.error("\nSomething went wrong:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
