import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import {
  InvalidPaymentSignatureError,
  verifiedPaymentEventSchema,
  type CreatePaymentInput,
  type PaymentProvider,
  type VerifiedPaymentEvent,
} from "@/features/payments/model/payment-provider";

const sessionSchema = z.object({
  paymentId: z.uuid(),
  orderId: z.uuid(),
  amountMinor: z.number().int().positive(),
  currency: z.literal("USD"),
}).strict();

const eventSchema = z.object({
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  paymentId: z.uuid(),
  providerPaymentId: z.string().min(1),
  amountMinor: z.number().int().positive(),
  currency: z.literal("USD"),
  outcome: z.enum(["paid", "failed", "cancelled"]),
}).strict();

type LocalOutcome = z.infer<typeof eventSchema>["outcome"];

function validDigest(expected: string, supplied: string): boolean {
  try {
    const left = Buffer.from(expected, "base64url");
    const right = Buffer.from(supplied, "base64url");
    return left.length === 32 && right.length === 32 && timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export class LocalPaymentProvider implements PaymentProvider {
  readonly name = "local" as const;

  constructor(private readonly secret: string, private readonly appOrigin: string) {
    if (secret.length < 32 || !["localhost", "127.0.0.1"].includes(new URL(appOrigin).hostname)) {
      throw new Error("Local payment configuration is invalid");
    }
  }

  async createPayment(input: CreatePaymentInput) {
    const amountMinor = input.lines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) throw new Error("Invalid payment amount");
    const payload = Buffer.from(JSON.stringify(sessionSchema.parse({
      paymentId: input.paymentId,
      orderId: input.orderId,
      amountMinor,
      currency: input.currency,
    }))).toString("base64url");
    const signature = this.digest(payload);
    const providerPaymentId = `${payload}.${signature}`;
    return { providerPaymentId, redirectUrl: this.url(providerPaymentId) };
  }

  async recoverRedirectUrl(providerPaymentId: string) {
    return this.readSession(providerPaymentId) ? this.url(providerPaymentId) : null;
  }

  async expireOpenPayment(providerPaymentId: string): Promise<boolean> {
    if (!this.readSession(providerPaymentId)) return false;
    const event = this.createSignedEvent(providerPaymentId, "cancelled");
    const response = await fetch(new URL("/api/payments/webhook", this.appOrigin), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-aqverine-demo-signature": event.signature },
      body: event.rawBody,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  }

  readSession(token: string): z.infer<typeof sessionSchema> | null {
    if (token.length > 1024) return null;
    const parts = token.split(".");
    if (parts.length !== 2 || !validDigest(this.digest(parts[0]), parts[1])) return null;
    try {
      const parsed: unknown = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
      const result = sessionSchema.safeParse(parsed);
      return result.success ? result.data : null;
    } catch {
      return null;
    }
  }

  createSignedEvent(token: string, outcome: LocalOutcome) {
    const session = this.readSession(token);
    if (!session) throw new Error("Invalid local payment session");
    const rawBody = JSON.stringify(eventSchema.parse({
      eventId: `local:${session.paymentId}:${outcome}`,
      eventType: `local.payment.${outcome}`,
      paymentId: session.paymentId,
      providerPaymentId: token,
      amountMinor: session.amountMinor,
      currency: session.currency,
      outcome,
    }));
    return { rawBody, signature: this.digest(rawBody) };
  }

  async verifyWebhook(rawBody: string, signature: string): Promise<VerifiedPaymentEvent | null> {
    if (!validDigest(this.digest(rawBody), signature)) throw new InvalidPaymentSignatureError();
    try {
      const payload: unknown = JSON.parse(rawBody);
      const event = eventSchema.safeParse(payload);
      if (!event.success) return null;
      const session = this.readSession(event.data.providerPaymentId);
      if (!session || session.paymentId !== event.data.paymentId ||
        session.amountMinor !== event.data.amountMinor || session.currency !== event.data.currency) return null;
      const parsed = verifiedPaymentEventSchema.safeParse({
        ...event.data,
        provider: this.name,
        payloadHash: createHash("sha256").update(rawBody).digest("hex"),
      });
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  private digest(value: string) {
    return createHmac("sha256", this.secret).update(value).digest("base64url");
  }

  private url(token: string) {
    const url = new URL("/payment/demo", this.appOrigin);
    url.searchParams.set("session", token);
    return url.toString();
  }
}
