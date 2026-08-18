import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Temporary diagnostic route: shows the RAW, unprocessed response from
// DataMart's /products endpoint, so we can see its real shape and fix
// getPackages()'s parsing in src/lib/supplier.ts to match exactly.
// Visit this in your browser while logged in as admin - it's a GET route
// protected by admin auth, no curl/terminal needed.
export async function GET() {
  const session = getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const baseUrl = process.env.SUPPLIER_API_BASE_URL || "https://api.datamartgh.shop/api/store/v1";
  const apiKey = process.env.SUPPLIER_API_KEY || "";

  if (!apiKey) {
    return NextResponse.json({ error: "SUPPLIER_API_KEY is not set." }, { status: 500 });
  }

  try {
    const [productsRes, storeRes, walletRes] = await Promise.all([
      fetch(`${baseUrl}/products`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" }),
      fetch(`${baseUrl}/store`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" }),
      fetch(`${baseUrl}/wallet/balance`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" }),
    ]);
    const [products, store, wallet] = await Promise.all([
      productsRes.json().catch(() => null),
      storeRes.json().catch(() => null),
      walletRes.json().catch(() => null),
    ]);
    return NextResponse.json({
      products: { httpStatus: productsRes.status, body: products },
      store: { httpStatus: storeRes.status, body: store },
      wallet: { httpStatus: walletRes.status, body: wallet },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
