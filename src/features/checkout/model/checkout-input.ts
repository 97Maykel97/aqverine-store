import { z } from "zod";

export const checkoutRequestSchema = z.object({
  idempotencyKey: z.uuid(),
  name: z.string().trim().min(2).max(80),
  email: z.email().max(254),
  phone: z.string().trim().regex(/^\+?[\d\s()-]{10,20}$/),
  comment: z.string().trim().max(500),
  consent: z.literal(true),
}).strict();

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export class CheckoutError extends Error {
  constructor(readonly code: "EMPTY_CART" | "PRODUCT_UNAVAILABLE" | "INSUFFICIENT_STOCK" | "INVALID_TOTAL" | "PAYMENT_UNAVAILABLE" | "RETRY_CONFLICT" | "ORDER_UNAVAILABLE" | "PRICE_CHANGED") {
    super(code);
  }
}
