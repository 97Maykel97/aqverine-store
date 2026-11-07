import { describe, expect, it } from "vitest";

import { LocalPaymentProvider } from "@/features/payments/api/local-payment-provider";
import { InvalidPaymentSignatureError, type CreatePaymentInput } from "@/features/payments/model/payment-provider";

const input: CreatePaymentInput = {
  paymentId: "11111111-1111-4111-8111-111111111111",
  orderId: "22222222-2222-4222-8222-222222222222",
  customerEmail: "buyer@example.com",
  currency: "USD",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  lines: [{ name: "T-shirt", color: "Black", size: "M", quantity: 2, unitPriceMinor: 2900 }],
};

function provider() {
  return new LocalPaymentProvider("local-payment-secret-for-tests-0123456789", "http://localhost:3000");
}

describe("local payment provider", () => {
  it("creates a signed checkout link and verifies a paid webhook", async () => {
    const local = provider();
    const payment = await local.createPayment(input);
    expect(payment.redirectUrl).toContain("/payment/demo?session=");
    expect(local.readSession(payment.providerPaymentId)).toMatchObject({
      paymentId: input.paymentId, orderId: input.orderId, amountMinor: 5800, currency: "USD",
    });

    const event = local.createSignedEvent(payment.providerPaymentId, "paid");
    await expect(local.verifyWebhook(event.rawBody, event.signature)).resolves.toMatchObject({
      provider: "local", paymentId: input.paymentId, providerPaymentId: payment.providerPaymentId,
      amountMinor: 5800, currency: "USD", outcome: "paid",
    });
  });

  it("rejects forged signatures and modified checkout links", async () => {
    const local = provider();
    const payment = await local.createPayment(input);
    const event = local.createSignedEvent(payment.providerPaymentId, "failed");
    await expect(local.verifyWebhook(event.rawBody, "invalid")).rejects.toBeInstanceOf(InvalidPaymentSignatureError);
    expect(local.readSession(`${payment.providerPaymentId}x`)).toBeNull();
  });

  it("uses the same session and event identity for repeated requests", async () => {
    const local = provider();
    const first = await local.createPayment(input);
    const repeated = await local.createPayment(input);
    expect(repeated).toEqual(first);
    expect(local.createSignedEvent(first.providerPaymentId, "cancelled")).toEqual(
      local.createSignedEvent(repeated.providerPaymentId, "cancelled"),
    );
  });
});
