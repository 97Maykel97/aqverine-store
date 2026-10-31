import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { applyVerifiedPaymentEvent } from "@/features/payments/api/payment-webhook-service";
import { StripePaymentProvider } from "@/features/payments/api/stripe-provider";
import { InvalidPaymentSignatureError, type VerifiedPaymentEvent } from "@/features/payments/model/payment-provider";

const database = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/shared/lib/prisma", () => ({ getPrisma: () => ({ $transaction: database.transaction }) }));

const paymentId = "65ab1d5c-0279-4aa5-9b80-7ac5d435d1b4";
const orderId = "5e67e765-561a-41e1-a631-7927f4f1d3b4";
const variantId = "7d97d573-b36b-4ee8-aa38-7b7c0b813b21";

function verifiedEvent(outcome: VerifiedPaymentEvent["outcome"]): VerifiedPaymentEvent {
  return {
    provider: "stripe",
    eventId: `evt_${outcome}`,
    eventType: `checkout.session.${outcome}`,
    paymentId,
    providerPaymentId: "cs_test_123",
    amountMinor: 2900,
    currency: "USD",
    outcome,
    payloadHash: "a".repeat(64),
  };
}

function fakeTransaction() {
  let recorded = false;
  const transaction = {
    paymentWebhookEvent: {
      findUnique: vi.fn(async () => recorded ? { id: "recorded" } : null),
      create: vi.fn(async () => { recorded = true; return { id: "recorded" }; }),
      update: vi.fn(async () => ({})),
    },
    payment: {
      findUnique: vi.fn(async () => ({
        id: paymentId,
        provider: "stripe",
        providerPaymentId: null,
        status: "PENDING",
        amountMinor: 2900,
        currency: "USD",
        order: {
          id: orderId,
          userId: "a5165384-7001-4055-9bea-374ceaf3a65e",
          status: "PENDING_PAYMENT",
          items: [{ variantId, quantity: 1 }],
        },
      })),
      update: vi.fn(async () => ({})),
    },
    order: { update: vi.fn(async () => ({})) },
    cart: { findUnique: vi.fn(async () => null) },
    cartItem: { deleteMany: vi.fn(async () => ({})) },
    productVariant: { update: vi.fn(async () => ({})) },
  };
  database.transaction.mockImplementation(async (run: (client: typeof transaction) => Promise<unknown>) => run(transaction));
  return transaction;
}

describe("Stripe webhook", () => {
  it("rejects an invalid signature and accepts a signed paid event", async () => {
    const secret = "whsec_test_signature";
    const provider = new StripePaymentProvider("sk_test_local_only", secret, "http://localhost:3000");
    const payload = JSON.stringify({
      id: "evt_signed",
      type: "checkout.session.completed",
      data: { object: {
        id: "cs_test_123",
        metadata: { paymentId },
        payment_status: "paid",
        amount_total: 2900,
        currency: "usd",
      } },
    });
    const signature = new Stripe("sk_test_local_only").webhooks.generateTestHeaderString({ payload, secret });

    await expect(provider.verifyWebhook(payload, "t=1,v1=invalid")).rejects.toBeInstanceOf(InvalidPaymentSignatureError);
    await expect(provider.verifyWebhook(payload, signature)).resolves.toMatchObject({
      paymentId, providerPaymentId: "cs_test_123", outcome: "paid", amountMinor: 2900, currency: "USD",
    });
  });

  it("marks an order paid once when the same verified event is delivered twice", async () => {
    const transaction = fakeTransaction();
    const event = verifiedEvent("paid");

    expect(await applyVerifiedPaymentEvent(event)).toBe("processed");
    expect(await applyVerifiedPaymentEvent(event)).toBe("duplicate");
    expect(transaction.payment.update).toHaveBeenCalledTimes(1);
    expect(transaction.payment.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "PAID" }),
    }));
    expect(transaction.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "PAID" }),
    }));
    expect(transaction.productVariant.update).not.toHaveBeenCalled();
  });

  it("releases reserved stock once when payment is cancelled", async () => {
    const transaction = fakeTransaction();
    const event = verifiedEvent("cancelled");

    expect(await applyVerifiedPaymentEvent(event)).toBe("processed");
    expect(await applyVerifiedPaymentEvent(event)).toBe("duplicate");
    expect(transaction.productVariant.update).toHaveBeenCalledTimes(1);
    expect(transaction.productVariant.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: variantId }, data: { stock: { increment: 1 } },
    }));
    expect(transaction.order.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { status: "CANCELLED" },
    }));
  });
});
