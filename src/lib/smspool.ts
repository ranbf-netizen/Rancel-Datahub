const BASE_URL = process.env.SMSPOOL_API_URL || "https://api.smspool.net";
const API_KEY = process.env.SMSPOOL_API_KEY || "";

async function smsPoolCall(
  path: string,
  params: Record<string, string | number> = {}
) {
  if (!API_KEY) throw new Error("SMSPOOL_API_KEY is not set.");

  const body = new URLSearchParams({
    key: API_KEY,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)])
    ),
  });

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const data = await res.json().catch(() => null);

  if (!data) {
    throw new Error(
      `SMSPool API returned no/invalid JSON (HTTP ${res.status}) for ${path}.`
    );
  }

  return data;
}

/** Account balance in USD. */
export async function getSmsPoolBalance(): Promise<number> {
  const data = await smsPoolCall("/request/balance");

  const bal = Number(data.balance);

  if (Number.isNaN(bal)) {
    throw new Error("SMSPool balance: unexpected response.");
  }

  return bal;
}

/** List countries SMSPool supports. */
export async function getSmsPoolCountries() {
  const data = await smsPoolCall("/country/retrieve_all");

  if (!Array.isArray(data)) {
    throw new Error("SMSPool countries: unexpected response.");
  }

  return data as {
    ID: string;
    name: string;
    region?: string;
  }[];
}

/** List services SMSPool supports. */
export async function getSmsPoolServices() {
  const data = await smsPoolCall("/service/retrieve_all");

  if (!Array.isArray(data)) {
    throw new Error("SMSPool services: unexpected response.");
  }

  return data as {
    ID: string;
    name: string;
  }[];
}

/** Live USD price for one country + service combo. */
export async function getSmsPoolPrice(
  countryId: string,
  serviceId: string
): Promise<number> {
  const data = await smsPoolCall("/request/price", {
  country: countryId,
  service: serviceId,
});

  const price =
    typeof data === "number"
      ? data
      : Number(data.price ?? data[serviceId] ?? data.cost);

  if (Number.isNaN(price) || price <= 0) {
    throw new Error(
      "SMSPool pricing: could not price this country/service combo."
    );
  }

  return price;
}

/** Rents a number for one country + service. */
export async function orderSmsPoolNumber(params: {
  countryId: string;
  serviceId: string;
}) {
  const data = await smsPoolCall("/purchase/sms", {
    country: params.countryId,
    service: params.serviceId,
  });

  if (!data.success || data.success === "0") {
    throw new Error(data.message || "SMSPool order failed.");
  }

  return {
    orderId: String(data.order_id),
    number: String(data.number),
    expiresInSeconds: Number(data.expires_in) || 600,
  };
}

/** Poll for the verification code on a rented number. */
export async function checkSmsPoolCode(orderId: string) {
  const data = await smsPoolCall("/sms/check", {
    orderid: orderId,
  });

  return {
    received: Number(data.status) === 3 && !!data.sms,
    code: data.sms ? String(data.sms) : null,
    fullSms: data.full_sms ? String(data.full_sms) : null,
    rawStatus: data.status,
  };
}

/** Cancel a rental. */
export async function cancelSmsPoolOrder(orderId: string) {
  await smsPoolCall("/sms/cancel", {
    orderid: orderId,
  });
}
