import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/account/orders/[orderId]/retry-payment/route";

const mocks = vi.hoisted(() => ({ context: vi.fn(), allowed: vi.fn(), provider: vi.fn(), retry: vi.fn() }));
vi.mock("@/features/account/api/account-http", () => ({
  accountJson: (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status }),
  getAccountRequestContext: mocks.context,
  readAccountBody: (request: NextRequest) => request.json(),
}));
vi.mock("@/features/auth/model/rate-limit", () => ({ allowAuthAttempt: mocks.allowed }));
vi.mock("@/features/payments/api/stripe-provider", () => ({ getPaymentProvider: mocks.provider }));
vi.mock("@/features/checkout/api/checkout-service", () => ({ retryOrderPayment: mocks.retry }));

const orderId = "d7de2cef-16ab-4b38-9346-c5e4b6a693d7";
const idempotencyKey = "adf00919-c5cb-4b10-9f97-c2c77dcb0206";

function request(origin = "https://aqverine.example", body: unknown = { idempotencyKey }) {
  return new NextRequest(`https://aqverine.example/api/account/orders/${orderId}/retry-payment`, {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.allowed.mockReturnValue(true);
  mocks.context.mockResolvedValue({
    ok: true, userId: "71149471-df55-469e-a293-8a19d8a1fa81", finish: (response: NextResponse) => response,
  });
  mocks.provider.mockReturnValue({ name: "stripe" });
  mocks.retry.mockResolvedValue({ orderId, redirectUrl: "https://checkout.stripe.com/c/pay/retry" });
});

describe("payment retry route", () => {
  it("rejects foreign origins and invalid keys before reading the session", async () => {
    const foreign = await POST(request("https://unrelated.example"), { params: Promise.resolve({ orderId }) });
    const invalid = await POST(request(undefined, { idempotencyKey: "bad" }), { params: Promise.resolve({ orderId }) });

    expect(foreign.status).toBe(403);
    expect(invalid.status).toBe(400);
    expect(mocks.context).not.toHaveBeenCalled();
  });

  it("uses the authenticated owner and never accepts a client-supplied user ID", async () => {
    const result = await POST(request(), { params: Promise.resolve({ orderId }) });

    expect(result.status).toBe(200);
    expect(mocks.retry).toHaveBeenCalledWith("71149471-df55-469e-a293-8a19d8a1fa81", orderId, idempotencyKey, { name: "stripe" });
  });
});
