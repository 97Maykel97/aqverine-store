import { z } from "zod";

const serverCartItemSchema = z.object({
  variantId: z.uuid(),
  sku: z.string(),
  slug: z.string(),
  name: z.string(),
  color: z.string(),
  size: z.string(),
  quantity: z.number().int().positive(),
  availableStock: z.number().int().nonnegative(),
  available: z.boolean(),
  unitPriceMinor: z.number().int().positive(),
  lineTotalMinor: z.number().int().nonnegative(),
  currency: z.string(),
  imageUrl: z.string().nullable(),
});

export const serverCartSchema = z.object({
  items: z.array(serverCartItemSchema),
  count: z.number().int().nonnegative(),
  totalMinor: z.number().int().nonnegative(),
  currency: z.string(),
});

const mergeResponseSchema = z.object({
  merged: z.boolean(),
  skipped: z.array(z.string()),
  adjusted: z.array(z.string()),
  cart: serverCartSchema,
});

export const catalogVariantLookupSchema = z.object({
  variants: z.array(z.object({ id: z.uuid(), sku: z.string() })),
});

export type ServerCart = z.infer<typeof serverCartSchema>;

export const parseMergeResponse = (value: unknown) => mergeResponseSchema.parse(value);
