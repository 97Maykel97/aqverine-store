import { z } from "zod";

export const accountProfileSchema = z.object({
  email: z.email(),
  fullName: z.string().nullable(),
  phone: z.string().nullable(),
});

const orderItemSchema = z.object({
  productName: z.string(),
  color: z.string(),
  size: z.string(),
  quantity: z.number().int().positive(),
  unitPriceMinor: z.number().int().nonnegative(),
  lineTotalMinor: z.number().int().nonnegative(),
});

const orderStatusSchema = z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"]);
const paymentStatusSchema = z.enum(["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"]).nullable();

const orderSummarySchema = z.object({
  id: z.uuid(),
  number: z.number().int().positive(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  totalMinor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  createdAt: z.string(),
  items: z.array(orderItemSchema),
});

export const accountOrdersSchema = z.object({
  items: z.array(orderSummarySchema),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  pages: z.number().int().nonnegative(),
});

export const accountOrderDetailSchema = orderSummarySchema.extend({
  subtotalMinor: z.number().int().nonnegative(),
  paidAt: z.string().nullable(),
  contact: z.object({ name: z.string(), phone: z.string(), email: z.email() }),
  comment: z.string().nullable(),
});

export type AccountProfile = z.infer<typeof accountProfileSchema>;
export type AccountOrders = z.infer<typeof accountOrdersSchema>;
