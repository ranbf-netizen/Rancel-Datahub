/**
 * Client for the gainrealgrowth SMM panel API (https://gainrealgrowth.com/api/v2).
 * All calls are POST with form params: key, action, ...
 *
 * IMPORTANT: this panel is prepaid — YOUR panel balance funds each order. Always
 * check balance before placing an order so we never take a customer's Paystack
 * payment and then fail to fulfil (see placeBoostOrder's balance guard).
 *
 * Prices from the panel are in USD. Your shop sells in GHS; you set the GHS
 * selling price on each boosting product yourself, so no currency conversion is
 * needed here — we only use the API to place/track the actual boost.
 */

const BASE_URL = process.env.SMM_API_URL || "https://gainrealgrowth.com/api/v2";
const API_KEY = process.env.SMM_API_KEY || "";

async function smmCall(params: Record<string, string | number>) {
  if (!API_KEY) throw new Error("SMM_API_KEY is not set.");
  const body = new URLSearchParams({ key: API_KEY, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!data) throw new Error(`SMM API returned no/invalid JSON (HTTP ${res.status}).`);
  return data;
}

/** Panel balance in USD. */
export async function getSmmBalance(): Promise<{ balance: number; currency: string }> {
  const data = await smmCall({ action: "balance" });
  if (data.error) throw new Error(`SMM balance error: ${data.error}`);
  return { balance: Number(data.balance), currency: data.currency || "USD" };
}

/** List available services from the panel. */
export async function getSmmServices() {
  const data = await smmCall({ action: "services" });
  if (!Array.isArray(data)) throw new Error("SMM services: unexpected response.");
  return data;
}

/** Place a boost order. Returns the panel order id. */
export async function placeBoostOrder(params: { service: number; link: string; quantity: number }) {
  const data = await smmCall({ action: "add", service: params.service, link: params.link, quantity: params.quantity });
  if (data.error) throw new Error(`SMM order error: ${data.error}`);
  if (!data.order) throw new Error("SMM order: no order id returned.");
  return { orderId: String(data.order) };
}

/** Check one order's status. */
export async function getBoostOrderStatus(orderId: string) {
  const data = await smmCall({ action: "status", order: orderId });
  if (data.error) throw new Error(`SMM status error: ${data.error}`);
  return {
    status: String(data.status || "").toLowerCase(), // e.g. "in progress", "partial", "completed"
    remains: data.remains,
    startCount: data.start_count,
    charge: data.charge,
  };
}
