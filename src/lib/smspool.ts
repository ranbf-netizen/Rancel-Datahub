/**
 * Client for the SMSPool API (https://api.smspool.net).
 * Official docs: https://www.smspool.net/article/how-to-use-the-smspool-api
 *
 * All calls are POST with form params, key included in every request. Same
 * "prepaid balance funds every order" model as your SMM boosting panel - see
 * getSmsPoolBalance() and the balance guard in fulfillSmsOrder().
 */

const BASE_URL = process.env.SMSPOOL_API_URL || "https://api.smspool.net";
const API_KEY = process.env.SMSPOOL_API_KEY || "";

async function smsPoolCall(path: string, params: Record<string, string | number> = {}) {
  if (!API_KEY) throw new Error("SMSPOOL_API_KEY is not set.");
  const body = new URLSearchParams({ key: API_KEY, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!data) throw new Error(`SMSPool API returned no/invalid JSON (HTTP ${res.status}) for ${path}.`);
  return data;
}

/** Account balance in USD. */
export async function getSmsPoolBalance(): Promise<number> {
  const data = await smsPoolCall("/request/balance");
  const bal = Number(data.balance);
  if (Number.isNaN(bal)) throw new Error("SMSPool balance: unexpected response.");
  return bal;
}

/** List countries SMSPool supports. */
export async function getSmsPoolCountries() {
  const data = await smsPoolCall("/country/retrieve_all");
  if (!Array.isArray(data)) throw new Error("SMSPool countries: unexpected response.");
  return data as { ID: string; name: string; region?: string }[];
}

/** List services SMSPool supports (site/app names, e.g. WhatsApp, Telegram, Google). */
export async function getSmsPoolServices() {
  const data = await smsPoolCall("/service/retrieve_all");
  if (!Array.isArray(data)) throw new Error("SMSPool services: unexpected response.");
  return data as { ID: string; name: string }[];
}

/** Live USD price for one country + service combo. */
export async function getSmsPoolPrice(countryId: string, serviceId: string): Promise<number> {
  const data = await smsPoolCall("/request/pricing", { country: countryId, service: serviceId });
  // Pricing endpoint can return either a flat number or a small object depending on the service;
  // handle both defensively rather than assuming one shape.
  const price = typeof data === "number" ? data : Number(data.price ?? data[serviceId] ?? data.cost);
  if (Number.isNaN(price) || price <= 0) throw new Error("SMSPool pricing: could not price this country/service combo.");
  return price;
}

/** Rents a number for one country + service. Returns the number and how long it's valid for. */
export async function orderSmsPoolNumber(params: { countryId: string; serviceId: string }) {
  const data = await smsPoolCall("/purchase/sms", { country: params.countryId, service: params.serviceId });
  if (!data.success || data.success === "0") throw new Error(data.message || "SMSPool order failed.");
  return {
    orderId: String(data.order_id),
    number: String(data.number),
    expiresInSeconds: Number(data.expires_in) || 600,
  };
}

/** Poll for the verification code on a rented number. */
export async function checkSmsPoolCode(orderId: string) {
  const data = await smsPoolCall("/sms/check", { orderid: orderId });
  // status: 1 = pending, 3 = code received (per SMSPool's docs), other values indicate
  // cancelled/expired/refunded - treated as "not yet received" here, the expiry timer
  // is what ultimately closes the window on our side.
  return {
    received: Number(data.status) === 3 && !!data.sms,
    code: data.sms ? String(data.sms) : null,
    fullSms: data.full_sms ? String(data.full_sms) : null,
    rawStatus: data.status,
  };
}

/** Cancel a rental (e.g. if payment succeeded but we want to release it). */
export async function cancelSmsPoolOrder(orderId: string) {
  await smsPoolCall("/sms/cancel", { orderid: orderId });
}

/** Ask for the SMS again on the SAME still-active number - e.g. the buyer got
 * a code but it turned out to be wrong/expired, and the number is still
 * within its rental window. Mirrors SMSPool's own "Resend" button. */
export async function resendSmsPoolCode(orderId: string) {
  const data = await smsPoolCall("/sms/resend", { orderid: orderId });
  if (data.success === false || data.success === "0") throw new Error(data.message || "Could not request the code again.");
}
