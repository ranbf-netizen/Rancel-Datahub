/**
 * Wrapper around the mydatagigs.com data bundle supplier API.
 *
 * Docs summary (see /docs/supplier-api.md for the raw copy the client sent):
 *  - Auth: Authorization: Bearer <SUPPLIER_API_KEY>
 *  - GET  /packages?network=mtn            -> catalog + supplier cost prices
 *  - POST /place-order                     -> { network, beneficiary, "pa_data-bundle-packages": <package_id> }
 *  - GET  /order-status?order_id=...       -> delivery status
 *  - GET  /wallet-balance                  -> OUR balance on mydatagigs.com (must stay funded)
 *
 * Important: this wallet is separate from customer payments. Customers pay us via
 * Paystack; we then spend from our own mydatagigs.com wallet to fulfill each order.
 */

const BASE_URL = process.env.SUPPLIER_API_BASE_URL || "https://mydatagigs.com/wp-json/custom/v1";
const API_KEY = process.env.SUPPLIER_API_KEY || "";

export type SupplierNetwork = "mtn" | "telecel" | "at_bigdata" | "at_ishare";

export type SupplierPackage = {
  package_id: number;
  label: string;
  price: number;
  data_size: number;
};

async function supplierFetch(path: string, options: RequestInit = {}) {
  if (!API_KEY) {
    throw new Error(
      "SUPPLIER_API_KEY is not set. Add it to your environment before placing live orders."
    );
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data || data.status !== "success") {
    throw new Error(
      `Supplier API error (${res.status}): ${data ? JSON.stringify(data) : "no response body"}`
    );
  }

  return data;
}

export async function getPackages(network: SupplierNetwork): Promise<SupplierPackage[]> {
  const data = await supplierFetch(`/packages?network=${network}`);
  return data.packages as SupplierPackage[];
}

export async function placeOrder(params: {
  network: SupplierNetwork;
  beneficiary: string;
  packageId: number;
}) {
  const data = await supplierFetch(`/place-order`, {
    method: "POST",
    body: JSON.stringify({
      network: params.network,
      beneficiary: params.beneficiary,
      "pa_data-bundle-packages": params.packageId,
    }),
  });

  return {
    orderId: data.order_id as number,
    amount: data.amount as number,
    network: data.network as string,
    beneficiary: data.beneficiary as string,
  };
}

export async function getOrderStatus(orderId: number | string) {
  const data = await supplierFetch(`/order-status?order_id=${orderId}`);
  return {
    orderId: data.order_id as number,
    orderStatus: data.order_status as string, // e.g. "Delivered"
    amount: data.amount as number,
  };
}

export async function getWalletBalance(): Promise<number> {
  const data = await supplierFetch(`/wallet-balance`);
  return data.balance as number;
}

// Admin dashboard uses this to warn when the mydatagigs wallet is running low,
// since a low balance there means paid customer orders will start failing.
export const LOW_BALANCE_THRESHOLD = 50; // GHS - adjust as needed
