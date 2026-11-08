import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as startCheckout } from "@/app/api/checkout/route";
import { POST as retryPayment } from "@/app/api/account/orders/[orderId]/retry-payment/route";
import { POST as completeDemoPayment } from "@/app/api/payments/demo/complete/route";
import { UserRole } from "@/generated/prisma/client";

const mocks = vi.hoisted(() => ({
  accountContext: vi.fn(),
  allowed: vi.fn(),
  provider: vi.fn(),
  checkout: vi.fn(),
  retry: vi.fn(),
}));

vi.mock("@/features/account/api/account-http", () => ({
  accountJson: (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status }),
  getAccountRequestContext: mocks.accountContext,
  readAccountBody: (request: NextRequest) => request.json(),
}));
vi.mock("@/features/auth/model/rate-limit", () => ({ allowAuthAttempt: mocks.allowed }));
vi.mock("@/features/payments/api/stripe-provider", () => ({ getPaymentProvider: mocks.provider }));
vi.mock("@/features/checkout/api/checkout-service", () => ({
  startCheckout: mocks.checkout,
  retryOrderPayment: mocks.retry,
}));

const origin = "http://localhost:3000";
const orderId = "d7de2cef-16ab-4b38-9346-c5e4b6a693d7";
const idempotencyKey = "adf00919-c5cb-4b10-9f97-c2c77dcb0206";

function request(path: string, body: Record<string, unknown>) {
  return new NextRequest(`${origin}${path}`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.allowed.mockReturnValue(true);
  mocks.provider.mockReturnValue({ name: "local" });
  mocks.accountContext.mockResolvedValue({
    ok: true,
    userId: "71149471-df55-469e-a293-8a19d8a1fa81",
    role: UserRole.USER,
    finish: (response: NextResponse) => response,
  });
});

describe("buyer access to local payment simulation", () => {
  it("does not create an order when only the local provider is configured", async () => {
    const response = await startCheckout(request("/api/checkout", {
      idempotencyKey,
      name: "Example Buyer",
      email: "buyer@example.com",
      phone: "+15551234567",
      comment: "",
      consent: true,
    }));

    expect(response.status).toBe(503);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("does not start a retry payment with the local provider", async () => {
    const response = await retryPayment(
      request(`/api/account/orders/${orderId}/retry-payment`, { idempotencyKey }),
      { params: Promise.resolve({ orderId }) },
    );

    expect(response.status).toBe(503);
    expect(mocks.retry).not.toHaveBeenCalled();
  });

  it("does not let a buyer report a successful payment", async () => {
    const response = await completeDemoPayment(request("/api/payments/demo/complete", {
      session: "signed-token",
      outcome: "paid",
    }));

    expect(response.status).toBe(403);
    expect(mocks.provider).not.toHaveBeenCalled();
  });
});
