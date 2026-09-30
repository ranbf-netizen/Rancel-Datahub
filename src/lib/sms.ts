// Arkesel SMS client. Set ARKESEL_API_KEY and ARKESEL_SENDER_ID in the environment.
// Sender ID must be an approved Arkesel sender name (max 11 chars).

const API_URL = "https://sms.arkesel.com/sms/api?action=send-sms";

// Convert a Ghana number to Arkesel's required international format (233XXXXXXXXX).
export function toIntlFormat(raw: string): string | null {
  const n = (raw || "").replace(/\D/g, "");
  if (n.startsWith("233") && n.length === 12) return n;      // already 233...
  if (n.startsWith("0") && n.length === 10) return "233" + n.slice(1); // 0XX... -> 233XX...
  if (n.length === 9) return "233" + n;                       // XXXXXXXXX -> 233...
  return null; // invalid
}

// Send one SMS to a batch of recipients (comma-separated). Returns the API result.
export async function sendSms(recipients: string[], message: string): Promise<{ ok: boolean; sent: number; error?: string; balance?: number }> {
  const apiKey = process.env.ARKESEL_API_KEY;
  const sender = process.env.ARKESEL_SENDER_ID;
  if (!apiKey || !sender) return { ok: false, sent: 0, error: "Arkesel not configured (ARKESEL_API_KEY / ARKESEL_SENDER_ID)." };

  const valid = recipients.map(toIntlFormat).filter((n): n is string => !!n);
  if (valid.length === 0) return { ok: false, sent: 0, error: "No valid recipient numbers." };

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send-sms",
        api_key: apiKey,
        to: valid.join(","),
        from: sender,
        sms: message,
      }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (data && data.code === "ok") {
      return { ok: true, sent: valid.length, balance: data.balance };
    }
    return { ok: false, sent: 0, error: (data && data.message) || `Arkesel error (HTTP ${res.status}).` };
  } catch (err: any) {
    return { ok: false, sent: 0, error: err.message || "Network error." };
  }
}