import { z } from "zod";

export const verifiedPaymentEventSchema = z.object({
  provider: z.string().min(1).max(64),
  eventId: z.string().min(1),
  eventType: z.string().min(1),
  paymentId: z.uuid(),
  providerPaymentId: z.string().min(1).nullable(),
  amountMinor: z.number().int().positive(),
  currency: z.string().length(3),
  outcome: z.enum(["paid", "failed", "cancelled", "refunded"]),
  payloadHash: z.string().length(64),
});

export type VerifiedPaymentEvent = z.infer<typeof verifiedPaymentEventSchema>;

export interface CreatePaymentInput {
  paymentId: string;
  orderId: string;
  customerEmail: string;
  currency: "USD";
  idempotencyKey: string;
  lines: readonly { name: string; color: string; size: string; quantity: number; unitPriceMinor: number }[];
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<{ providerPaymentId: string; redirectUrl: string }>;
  recoverRedirectUrl(providerPaymentId: string): Promise<string | null>;
  verifyWebhook(rawBody: string, signature: string): Promise<VerifiedPaymentEvent | null>;
}

export class InvalidPaymentSignatureError extends Error {
  constructor() {
    super("Invalid payment webhook signature");
  }
}
