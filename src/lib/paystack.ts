/**
 * Paystack integration - pay-per-order (no wallet).
 * Keys are left blank in .env until the client provides them; every call below
 * will throw a clear error until PAYSTACK_SECRET_KEY is set, rather than failing silently.
 */

const PAYSTACK_BASE_URL = "https://api.paystack.co";

function requireSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not set yet. Add it to your environment before accepting real payments."
    );
  }
  return key;
}

export async function initializeTransaction(params: {
  email: string;
  amountGhs: number; // amount in GHS (converted to pesewas below)
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  const secretKey = requireSecretKey();

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amountGhs * 100), // pesewas
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata || {},
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(`Paystack initialize failed: ${JSON.stringify(data)}`);
  }

  return data.data as { authorization_url: string; access_code: string; reference: string };
}

export async function verifyTransaction(reference: string) {
  const secretKey = requireSecretKey();

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(`Paystack verify failed: ${JSON.stringify(data)}`);
  }

  return data.data as { status: string; amount: number; reference: string; customer: { email: string } };
}

// Used to validate the x-paystack-signature header on incoming webhooks.
export function isConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}
