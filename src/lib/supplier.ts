/**
 * Wrapper around the Cledanet data bundle supplier API (backend.mycledanet.com).
 *
 * Key things that differ from previous suppliers we've integrated:
 *  - Response envelope uses a BOOLEAN `status` field (true/false), not a string
 *    like "success" - and the payload lives under `payload`, not `data`.
 *  - Prices AND wallet balance are returned in PESEWAS, not cedis (divide by 100
 *    everywhere we display or store a GHS amount).
 *  - Auth header is `X-API-Key`, not `Authorization: Bearer`.
 *  - There is NO catalog/packages endpoint - Cledanet only exposes balance,
 *    place-order, and order-status. Bundle sizes/prices must be entered manually
 *    by admin (see /admin/bundles - "Add Bundle" instead of "Sync from supplier").
 *  - Networks use these exact 4 values, used directly as both our DB values and
 *    Cledanet's API values (no translation table, to avoid the mapping-mismatch
 *    bugs we hit with the previous two suppliers): MTN, TELECEL,
 *    AIRTELTIGO_ISHARE, AIRTELTIGO_BIGTIME.
 *  - UNCONFIRMED: the exact set of order status strings beyond "PENDING" (their
 *    docs only show that one example). getOrderStatus() below treats "COMPLETED"
 *    and "DELIVERED" as success, "FAILED"/"CANCELLED"/"REJECTED" as failure, and
 *    anything else as still-in-progress. If Cledanet uses different wording,
 *    orders will just stay PROCESSING until this is corrected - check via the
 *    admin "Check delivery" button, which surfaces the raw status text returned.
 */

const BASE_URL = process.env.SUPPLIER_API_BASE_URL || "https://backend.mycledanet.com/api";
const API_KEY = process.env.SUPPLIER_API_KEY || "";

export type SupplierNetwork = "MTN" | "TELECEL" | "AIRTELTIGO_ISHARE" | "AIRTELTIGO_BIGTIME";

async function supplierFetch(path: string, options: RequestInit = {}) {
  if (!API_KEY) {
    throw new Error(
      "SUPPLIER_API_KEY is not set. Add it to your environment before placing live orders."
    );
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data || data.status !== true) {
    const message = data ? JSON.stringify(data) : `HTTP ${res.status} with no response body`;
    throw new Error(`Supplier API error (${res.status}): ${message}`);
  }

  return data.payload;
}

export async function getWalletBalance(): Promise<number> {
  const pesewas = await supplierFetch(`/balance`);
  return Number(pesewas) / 100;
}

export async function placeOrder(params: {
  network: SupplierNetwork;
  beneficiary: string;
  packageId: number; // the size in GB - Cledanet has no separate package ID, size IS the identity
}) {
  const payload = await supplierFetch(`/order`, {
    method: "POST",
    body: JSON.stringify({
      phone: params.beneficiary,
      size: params.packageId,
      network: params.network,
      ...(process.env.NEXT_PUBLIC_APP_URL
        ? { callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cledanet` }
        : {}),
    }),
  });

  return {
    orderId: payload.id as string, // Cledanet's UUID - store as our supplierOrderId
    orderCode: payload.orderCode as string,
    amount: Number(payload.price) / 100, // pesewas -> GHS
    network: payload.network as string,
    beneficiary: payload.phone as string,
    status: payload.status as string, // e.g. "PENDING"
  };
}

const SUCCESS_STATUSES = ["COMPLETED", "DELIVERED", "SUCCESS"];
const FAILURE_STATUSES = ["FAILED", "CANCELLED", "CANCELED", "REJECTED"];

export async function getOrderStatus(orderId: string) {
  const payload = await supplierFetch(`/order/${orderId}`);
  const rawStatus = String(payload.status || "").toUpperCase();

  let orderStatus: string;
  if (SUCCESS_STATUSES.includes(rawStatus)) orderStatus = "completed";
  else if (FAILURE_STATUSES.includes(rawStatus)) orderStatus = "failed";
  else orderStatus = "pending"; // still in progress - covers PENDING and anything unrecognized

  return {
    orderId: payload.id as string,
    orderStatus,
    rawStatus, // exposed for debugging via the admin "Check delivery" button
    amount: Number(payload.price) / 100,
  };
}

// Admin dashboard uses this to warn when the Cledanet balance is running low,
// since a low balance means paid customer orders will start failing.
export const LOW_BALANCE_THRESHOLD = 50; // GHS - adjust as needed

// --- AFA Registration (separate from data bundle ordering) ---

export type AfaRegistrationInput = {
  fullName: string;
  phoneNumber: string;
  idNumber: string;
  dateOfBirth: string; // "YYYY-MM-DD"
  town: string;
  occupation: string;
  region: string;
  cropProduce?: string;
};

export async function submitAfaRegistration(input: AfaRegistrationInput) {
  const payload = await supplierFetch(`/afa-registration`, {
    method: "POST",
    body: JSON.stringify({
      ...input,
      ...(process.env.NEXT_PUBLIC_APP_URL
        ? { callback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cledanet-afa` }
        : {}),
    }),
  });

  return {
    supplierId: payload.id as string,
    status: payload.status as string, // e.g. "PENDING"
  };
}
