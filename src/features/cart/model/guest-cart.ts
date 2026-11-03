import { z } from "zod";

import { mockProducts } from "@/features/catalog/model/mock-products";
import type { CatalogProduct } from "@/shared/types/catalog";

const cartLineSchema = z.object({
  variantId: z.string(),
  quantity: z.number().int().positive(),
});

const cartSchema = z.array(cartLineSchema);

export type GuestCartLine = z.infer<typeof cartLineSchema>;

export const GUEST_CART_STORAGE_KEY = "aqverine-guest-cart-v1";

export const findCartVariant = (variantId: string, products: readonly CatalogProduct[] = mockProducts) => {
  for (const product of products) {
    const variant = product.variants.find((item) => item.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
};

export const normalizeGuestCart = (input: unknown, products: readonly CatalogProduct[] = mockProducts): GuestCartLine[] => {
  const parsed = cartSchema.safeParse(input);
  if (!parsed.success) return [];

  const quantities = new Map<string, number>();
  for (const line of parsed.data) {
    const match = findCartVariant(line.variantId, products);
    if (!match) continue;
    quantities.set(
      line.variantId,
      Math.min(match.variant.stock, (quantities.get(line.variantId) ?? 0) + line.quantity),
    );
  }

  return Array.from(quantities, ([variantId, quantity]) => ({ variantId, quantity }));
};

export const setGuestCartQuantity = (
  cart: readonly GuestCartLine[],
  variantId: string,
  quantity: number,
  products: readonly CatalogProduct[] = mockProducts,
): GuestCartLine[] => {
  const match = findCartVariant(variantId, products);
  if (!match) return [...cart];
  const nextQuantity = Math.min(Math.max(0, quantity), match.variant.stock);
  const withoutVariant = cart.filter((line) => line.variantId !== variantId);
  return nextQuantity === 0
    ? withoutVariant
    : [...withoutVariant, { variantId, quantity: nextQuantity }];
};
