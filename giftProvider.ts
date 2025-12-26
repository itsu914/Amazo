// Provider wrapper: mock + skeleton implementations for Tango / Tremendous.
// Use env GIFT_PROVIDER="mock" (default) for local testing.
//
// NOTE: adjust payloads to match provider docs when you switch to real provider.

type IssueResult = {
  success: boolean;
  providerTxId?: string;
  code?: string;
  raw?: any;
};

export async function issueGiftMock({ userEmail, valueCents }: { userEmail: string; valueCents: number; }): Promise<IssueResult> {
  await new Promise((r) => setTimeout(r, 400));
  const code = `MOCK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  return {
    success: true,
    providerTxId: `mock-${Date.now()}`,
    code,
    raw: { note: "mock" }
  };
}

async function issueTremendous({ userEmail, valueCents }: { userEmail: string; valueCents: number; }): Promise<IssueResult> {
  const apiKey = process.env.TREMENDOUS_API_KEY;
  const apiUrl = process.env.TREMENDOUS_API_URL || "https://api.tremendous.com"; // override with sandbox URL if provided
  if (!apiKey) throw new Error("TREMENDOUS_API_KEY not set");
  const url = `${apiUrl}/v1/orders`; // confirm actual path with Tremendous docs
  const payload = {
    recipient: { email: userEmail },
    reward: { amount_cents: valueCents, currency: "USD" }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return { success: false, raw: { status: res.status, body: json } };
  }

  const providerTxId = json?.id || json?.order_id || undefined;
  const code = json?.reward_code || json?.code || undefined;
  return { success: true, providerTxId, code, raw: json };
}

async function issueTango({ userEmail, valueCents }: { userEmail: string; valueCents: number; }): Promise<IssueResult> {
  const apiKey = process.env.TANGO_API_KEY;
  const apiUrl = process.env.TANGO_API_URL || "https://api.tangocard.com"; // override for sandbox
  if (!apiKey) throw new Error("TANGO_API_KEY not set");
  const url = `${apiUrl}/raas/v2/orders`; // confirm with Tango docs
  const payload = {
    account_identifier: process.env.TANGO_ACCOUNT_IDENTIFIER || "your_account",
    customer_identifier: userEmail,
    reward: {
      value: (valueCents / 100).toFixed(2)
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    return { success: false, raw: { status: res.status, body: json } };
  }

  const providerTxId = json?.order_id || json?.id || undefined;
  const code = json?.reward_code || json?.certificate_code || undefined;
  return { success: true, providerTxId, code, raw: json };
}

export async function issueGift({ userEmail, valueCents }: { userEmail: string; valueCents: number; }): Promise<IssueResult> {
  const provider = (process.env.GIFT_PROVIDER || "mock").toLowerCase();
  if (provider === "mock") return issueGiftMock({ userEmail, valueCents });
  if (provider === "tremendous") return issueTremendous({ userEmail, valueCents });
  if (provider === "tango") return issueTango({ userEmail, valueCents });
  throw new Error(`Unsupported gift provider: ${provider}`);
}