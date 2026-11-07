import { createHash } from "node:crypto";

import Stripe from "stripe";

import { LocalPaymentProvider } from "@/features/payments/api/local-payment-provider";
import { InvalidPaymentSignatureError, verifiedPaymentEventSchema, type CreatePaymentInput, type PaymentProvider, type VerifiedPaymentEvent } from "@/features/payments/model/payment-provider";

const SESSION_LIFETIME_SECONDS = 30 * 60;

export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe" as const;
  private readonly stripe: Stripe;

  constructor(secretKey: string, private readonly webhookSecret: string, private readonly appOrigin: string) {
    if (!secretKey.startsWith("sk_test_") || !webhookSecret.startsWith("whsec_")) {
      throw new Error("Stripe test configuration is invalid");
    }
    this.stripe = new Stripe(secretKey);
  }

  async createPayment(input: CreatePaymentInput) {
    const session = await this.stripe.checkout.sessions.create({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      client_reference_id: input.orderId,
      customer_email: input.customerEmail,
      expires_at: Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS,
      success_url: `${this.appOrigin}/payment/success?order=${encodeURIComponent(input.orderId)}`,
      cancel_url: `${this.appOrigin}/payment/failure?order=${encodeURIComponent(input.orderId)}`,
      metadata: { paymentId: input.paymentId, orderId: input.orderId },
      payment_intent_data: { metadata: { paymentId: input.paymentId, orderId: input.orderId } },
      line_items: input.lines.map((line) => ({
        quantity: line.quantity,
        price_data: {
          currency: input.currency.toLowerCase(),
          unit_amount: line.unitPriceMinor,
          product_data: { name: `${line.name} · ${line.color} / ${line.size}` },
        },
      })),
    }, { idempotencyKey: input.idempotencyKey });

    if (!session.url) throw new Error("Stripe Checkout URL is unavailable");
    return { providerPaymentId: session.id, redirectUrl: session.url };
  }

  async recoverRedirectUrl(providerPaymentId: string) {
    const session = await this.stripe.checkout.sessions.retrieve(providerPaymentId);
    return session.status === "open" ? session.url : null;
  }

  async expireOpenPayment(providerPaymentId: string): Promise<boolean> {
    const session = await this.stripe.checkout.sessions.retrieve(providerPaymentId);
    if (session.status !== "open") return false;
    await this.stripe.checkout.sessions.expire(providerPaymentId);
    return true;
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<VerifiedPaymentEvent | null> {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch {
      throw new InvalidPaymentSignatureError();
    }
    const payloadHash = createHash("sha256").update(rawBody).digest("hex");
    let candidate: unknown = null;

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded" ||
      event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
      const session = event.data.object;
      if (event.type === "checkout.session.completed" && session.payment_status !== "paid") return null;
      candidate = {
        provider: this.name,
        eventId: event.id,
        eventType: event.type,
        paymentId: session.metadata?.paymentId,
        providerPaymentId: session.id,
        amountMinor: session.amount_total,
        currency: session.currency?.toUpperCase(),
        outcome: event.type === "checkout.session.expired" ? "cancelled" :
          event.type === "checkout.session.async_payment_failed" ? "failed" : "paid",
        payloadHash,
      };
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object;
      if (!charge.refunded || charge.amount_refunded !== charge.amount || !charge.payment_intent) return null;
      const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent.id;
      const intent = await this.stripe.paymentIntents.retrieve(intentId);
      candidate = {
        provider: this.name,
        eventId: event.id,
        eventType: event.type,
        paymentId: intent.metadata.paymentId,
        providerPaymentId: null,
        amountMinor: charge.amount,
        currency: charge.currency.toUpperCase(),
        outcome: "refunded",
        payloadHash,
      };
    }

    const parsed = verifiedPaymentEventSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
  }
}

export function getPaymentProvider(): PaymentProvider | null {
  if (process.env.PAYMENT_PROVIDER === "local") {
    if (process.env.NODE_ENV !== "development" || !process.env.PAYMENT_LOCAL_SECRET || !process.env.NEXT_PUBLIC_APP_URL) return null;
    try {
      return new LocalPaymentProvider(process.env.PAYMENT_LOCAL_SECRET, new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
    } catch {
      return null;
    }
  }
  if (process.env.PAYMENT_PROVIDER && process.env.PAYMENT_PROVIDER !== "stripe") return null;
  const secretKey = process.env.PAYMENT_PROVIDER_SECRET_KEY;
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!secretKey || !webhookSecret || !appUrl) return null;

  try {
    const url = new URL(appUrl);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && url.hostname !== "localhost") return null;
    const origin = url.origin;
    return new StripePaymentProvider(secretKey, webhookSecret, origin);
  } catch {
    return null;
  }
}
