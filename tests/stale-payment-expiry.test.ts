import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/internal/payments/expire-stale/route";
import { expireStalePaymentSessions } from "@/features/payments/api/expire-stale-sessions";
import type { PaymentProvider } from "@/features/payments/model/payment-provider";

const mocks = vi.hoisted(() => ({ findMany: vi.fn(), getPaymentProvider: vi.fn() }));
vi.mock("@/shared/lib/prisma", () => ({ getPrisma: () => ({ payment: { findMany: mocks.findMany } }) }));
vi.mock("@/features/payments/api/stripe-provider", () => ({ getPaymentProvider: mocks.getPaymentProvider }));

const token = "a-secure-test-token-with-at-least-32-characters";

function provider(): PaymentProvider {
  return {
    name: "stripe",
    createPayment: vi.fn(async () => ({ providerPaymentId: "", redirectUrl: "" })),
    recoverRedirectUrl: vi.fn(async () => null),
    verifyWebhook: vi.fn(async () => null),
    expireOpenPayment: vi.fn(async (id: string) => id === "cs_open"),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", token);
  mocks.findMany.mockResolvedValue([{ providerPaymentId: "cs_open" }, { providerPaymentId: "cs_expired" }]);
});
afterEach(() => vi.unstubAllEnvs());

describe("stale payment session expiration", () => {
  it("requires the server-only job secret before accessing Stripe or the database", async () => {
    const request = new NextRequest("http://localhost/api/internal/payments/expire-stale", {
      method: "POST", headers: { authorization: "Bearer wrong-token" },
    });

    expect((await POST(request)).status).toBe(401);
    expect(mocks.getPaymentProvider).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("expires only open provider sessions without changing order or payment status", async () => {
    const paymentProvider = provider();
    const now = new Date("2026-11-04T12:00:00Z");

    await expect(expireStalePaymentSessions(paymentProvider, now)).resolves.toEqual({
      inspected: 2, expired: 1, skipped: 1, failed: 0,
    });
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        provider: "stripe", status: "PENDING", providerPaymentId: { not: null },
        updatedAt: { lt: new Date("2026-11-04T11:35:00Z") },
        order: { status: "PENDING_PAYMENT" },
      }),
    }));
    expect(paymentProvider.expireOpenPayment).toHaveBeenCalledTimes(2);
  });

  it("runs the protected job with a valid secret and returns aggregate counts only", async () => {
    mocks.getPaymentProvider.mockReturnValue(provider());
    const request = new NextRequest("http://localhost/api/internal/payments/expire-stale", {
      method: "POST", headers: { authorization: `Bearer ${token}` },
    });

    const result = await POST(request);
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ inspected: 2, expired: 1, skipped: 1, failed: 0 });
  });
});
