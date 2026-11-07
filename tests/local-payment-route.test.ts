import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/payments/demo/complete/route";
import { LocalPaymentProvider } from "@/features/payments/api/local-payment-provider";

const mocks = vi.hoisted(() => ({ context: vi.fn(), allowed: vi.fn(), provider: vi.fn(), findPayment: vi.fn(), forward: vi.fn() }));
vi.mock("@/features/account/api/account-http", () => ({
  accountJson: (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status }),
  getAccountRequestContext: mocks.context,
  readAccountBody: (request: NextRequest) => request.json(),
}));
vi.mock("@/features/auth/model/rate-limit", () => ({ allowAuthAttempt: mocks.allowed }));
vi.mock("@/features/payments/api/stripe-provider", () => ({ getPaymentProvider: mocks.provider }));
vi.mock("@/shared/lib/prisma", () => ({ getPrisma: () => ({ payment: { findUnique: mocks.findPayment } }) }));

const userId = "71149471-df55-469e-a293-8a19d8a1fa81";
const paymentId = "11111111-1111-4111-8111-111111111111";
const orderId = "22222222-2222-4222-8222-222222222222";
let local: LocalPaymentProvider;
let session: string;

function request(outcome: "paid" | "failed" | "cancelled" = "paid", origin = "http://localhost:3000") {
  return new NextRequest("http://localhost:3000/api/payments/demo/complete", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ session, outcome }),
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  local = new LocalPaymentProvider("local-payment-secret-for-tests-0123456789", "http://localhost:3000");
  session = (await local.createPayment({
    paymentId, orderId, customerEmail: "buyer@example.com", currency: "USD", idempotencyKey: paymentId,
    lines: [{ name: "T-shirt", color: "Black", size: "M", quantity: 2, unitPriceMinor: 2900 }],
  })).providerPaymentId;
  mocks.context.mockResolvedValue({ ok: true, userId, finish: (response: NextResponse) => response });
  mocks.allowed.mockReturnValue(true);
  mocks.provider.mockReturnValue(local);
  mocks.forward.mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", mocks.forward);
});

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("local payment completion route", () => {
  it("rejects cross-origin requests before loading the account", async () => {
    const response = await POST(request("paid", "https://unrelated.example"));
    expect(response.status).toBe(403);
    expect(mocks.context).not.toHaveBeenCalled();
    expect(mocks.forward).not.toHaveBeenCalled();
  });

  it("does not complete a payment for another account", async () => {
    mocks.findPayment.mockResolvedValue({
      provider: "local", providerPaymentId: session, status: "PENDING", amountMinor: 5800, currency: "USD",
      order: { id: orderId, userId: "33333333-3333-4333-8333-333333333333", status: "PENDING_PAYMENT" },
    });
    const response = await POST(request());
    expect(response.status).toBe(404);
    expect(mocks.forward).not.toHaveBeenCalled();
  });

  it("forwards a signed event and returns only after the webhook changes status", async () => {
    mocks.findPayment.mockResolvedValueOnce({
      provider: "local", providerPaymentId: session, status: "PENDING", amountMinor: 5800, currency: "USD",
      order: { id: orderId, userId, status: "PENDING_PAYMENT" },
    }).mockResolvedValueOnce({ status: "PAID" });

    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.forward).toHaveBeenCalledTimes(1);
    const options = mocks.forward.mock.calls[0]?.[1] as RequestInit;
    const signature = new Headers(options.headers).get("x-aqverine-demo-signature") ?? "";
    await expect(local.verifyWebhook(String(options.body), signature)).resolves.toMatchObject({
      provider: "local", paymentId, outcome: "paid", amountMinor: 5800,
    });
    expect(await response.json()).toEqual({ redirectUrl: `http://localhost:3000/payment/success?order=${orderId}` });
  });
});
