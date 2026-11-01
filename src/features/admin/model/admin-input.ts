import { z } from "zod";

const moneySchema = z.number().int().min(1).max(2_147_483_647);
const categorySchema = z.enum(["T-shirts", "Hoodies", "Shirts", "Trousers", "Outerwear", "Accessories"]);

export const productIdSchema = z.uuid();

export const adminProductCreateSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(5000),
  category: categorySchema,
  composition: z.string().trim().max(500).nullable().optional(),
  careInstructions: z.string().trim().max(500).nullable().optional(),
  priceMinor: moneySchema,
  variants: z.array(z.object({
    sku: z.string().trim().min(2).max(100),
    color: z.string().trim().min(1).max(80),
    size: z.string().trim().min(1).max(30),
    stock: z.number().int().min(0).max(1_000_000),
    priceMinor: moneySchema.nullable().optional(),
  })).min(1).max(100),
}).strict().refine((value) => new Set(value.variants.map((variant) => `${variant.color}\0${variant.size}`)).size === value.variants.length, {
  message: "Duplicate color and size",
  path: ["variants"],
});

export const adminProductUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(10).max(5000).optional(),
  category: categorySchema.optional(),
  composition: z.string().trim().max(500).nullable().optional(),
  careInstructions: z.string().trim().max(500).nullable().optional(),
  priceMinor: moneySchema.optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export const adminVariantCreateSchema = z.object({
  sku: z.string().trim().min(2).max(100),
  color: z.string().trim().min(1).max(80),
  size: z.string().trim().min(1).max(30),
  stock: z.number().int().min(0).max(1_000_000),
  priceMinor: moneySchema.nullable().optional(),
}).strict();

export const adminVariantUpdateSchema = z.object({
  stock: z.number().int().min(0).max(1_000_000).optional(),
  priceMinor: moneySchema.nullable().optional(),
  isActive: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export const adminOrderStatusSchema = z.object({
  status: z.enum(["PROCESSING", "COMPLETED"]),
}).strict();

export type AdminProductCreateInput = z.infer<typeof adminProductCreateSchema>;
export type AdminProductUpdateInput = z.infer<typeof adminProductUpdateSchema>;
export type AdminVariantCreateInput = z.infer<typeof adminVariantCreateSchema>;
export type AdminVariantUpdateInput = z.infer<typeof adminVariantUpdateSchema>;
