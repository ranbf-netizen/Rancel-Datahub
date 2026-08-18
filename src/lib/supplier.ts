/**
 * Wrapper around the DataMart Agent Store API (api.datamartgh.shop).
 *
 * Key differences from the previous supplier (mydatagigs.com) that the rest
 * of the app has been updated to account for:
 *  - Orders are placed asynchronously: POST /orders returns "pending"
 *    immediately, then a webhook (order.completed / order.failed) fires
 *    roughly 30 seconds later with the real outcome. See
 *    /api/webhooks/datamart/route.ts and fulfillDataOrder() in
 *    lib/fulfillment.ts, which now leaves an order at PROCESSING until that
 *    webhook (or the fallback status-check sweep) resolves it.
 *  - Only 3 networks, not 4: YELLO (MTN), TELECEL, AT_PREMIUM (AirtelTigo).
 *  - POST /orders requires a unique X-Idempotency-Key per attempt (a UUID) -
 *    resending the same key returns the original response instead of
 *    double-charging the wallet.
 *  - Auth: Authorization: Bearer <SUPPLIER_API_KEY>
 */

import { v4 as uuid } from "uuid";

const BASE_URL = process.env.SUPPLIER_API_BASE_URL || "https://api.datamartgh.shop/api/store/v1";
const API_KEY = process.env.SUPPLIER_API_KEY || "";

// Our internal short network keys, mapped to DataMart's expected values.
export type SupplierNetwork = "mtn" | "telecel" | "airteltigo";

const NETWORK_MAP: Record<SupplierNetwork, string> = {
  mtn: "YELLO",
  telecel: "TELECEL",
  airteltigo: "AT_PREMIUM",
};

export type SupplierPackage = {
  package_id: number | string; // capacity is used as the identity here, id kept for interface compatibility
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
    const message = data ? JSON.stringify(data) : `HTTP ${res.status} with no response body`;
    throw new Error(`Supplier API error (${res.status}): ${message}`);
  }

  return data.data;
}

// Live product catalog + pricing for one network.
// NOTE: the exact shape of GET /products isn't fully documented by DataMart -
// this parses a reasonable structure (array of items with network/capacity/price)
// and should be double-checked against a real response after the first sync;
// adjust the field names below if their actual response differs.
export async function getPackages(network: SupplierNetwork): Promise<SupplierPackage[]> {
  const data = await supplierFetch(`/products`);
  const products: any[] = Array.isArray(data) ? data : data?.products || [];
  const apiNetwork = NETWORK_MAP[network];

  return products
        .filter((p) => p.network === apiNetwork && p.inStock)
    .map((p) => ({
      package_id: p.capacity, // DataMart identifies bundles by network+capacity, not a separate ID
      label: String(p.capacity),
            price: Number(p.basePrice),
      data_size: Number(p.capacity),
    }));
}

export async function placeOrder(params: {
  network: SupplierNetwork;
  beneficiary: string;
  packageId: number; // the capacity (GB) for this network - see getPackages() above
}) {
  const data = await supplierFetch(`/orders`, {
    method: "POST",
    headers: { "X-Idempotency-Key": uuid() },
    body: JSON.stringify({
      phoneNumber: params.beneficiary,
      network: NETWORK_MAP[params.network],
      capacity: params.packageId,
    }),
  });

  return {
    orderId: data.order.reference as string, // their reference - store this as our supplierOrderId
    amount: data.order.price as number,
    network: data.order.network as string,
    beneficiary: data.order.phoneNumber as string,
    status: data.order.status as string, // "pending" - completion arrives via webhook
  };
}

export async function getOrderStatus(reference: string) {
  const data = await supplierFetch(`/orders/${reference}`);
  return {
    orderId: data.reference as string,
    orderStatus: data.status as string, // "pending" | "completed" | "failed" | "refunded"
    amount: data.price as number,
  };
}

export async function getWalletBalance(): Promise<number> {
  const data = await supplierFetch(`/wallet/balance`);
  // "deposit" is the pool POST /orders spends from - "earnings" is unrelated
  // storefront revenue on DataMart's own side, not something we can spend via API.
  return data.deposit.balance as number;
}

// Admin dashboard uses this to warn when the DataMart deposit balance is running
// low, since a low balance there means paid customer orders will start failing.
export const LOW_BALANCE_THRESHOLD = 50; // GHS - adjust as needed
