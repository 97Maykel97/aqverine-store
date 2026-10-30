import { z } from "zod";

export const setCartItemSchema = z.object({
  variantId: z.uuid(),
  quantity: z.number().int().min(0).max(99),
}).strict();

export const mergeCartSchema = z.object({
  mergeKey: z.uuid(),
  lines: z.array(z.object({
    sku: z.string().trim().min(1).max(120),
    quantity: z.number().int().min(1).max(99),
  }).strict()).max(50),
}).strict();

export type SetCartItemInput = z.infer<typeof setCartItemSchema>;
export type MergeCartInput = z.infer<typeof mergeCartSchema>;

interface MergeVariant {
  id: string;
  sku: string;
  stock: number;
  existingQuantity: number;
}

export function planGuestCartMerge(lines: MergeCartInput["lines"], variants: readonly MergeVariant[]) {
  const requested = new Map<string, number>();
  for (const line of lines) requested.set(line.sku, (requested.get(line.sku) ?? 0) + line.quantity);

  const availableSkus = new Set(variants.filter((variant) => variant.stock > 0).map((variant) => variant.sku));
  const adjusted: string[] = [];
  const updates = variants.map((variant) => {
    const wanted = variant.existingQuantity + (requested.get(variant.sku) ?? 0);
    const quantity = Math.min(99, variant.stock, wanted);
    if (variant.stock > 0 && quantity < wanted) adjusted.push(variant.sku);
    return { variantId: variant.id, quantity };
  });

  return {
    updates,
    skipped: [...requested.keys()].filter((sku) => !availableSkus.has(sku)),
    adjusted,
  };
}

export class CartDomainError extends Error {
  constructor(
    readonly code: "PRODUCT_UNAVAILABLE" | "INSUFFICIENT_STOCK",
    readonly availableStock?: number,
  ) {
    super(code);
  }
}
