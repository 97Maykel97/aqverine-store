import { describe, expect, it } from "vitest";

import { normalizeGuestCart } from "@/features/cart/model/guest-cart";
import { publicProductSchema, toCatalogProduct } from "@/features/catalog/model/public-product";

const rawProduct = {
  id: "b94d5afe-46d1-4aeb-998d-f09125e516ea",
  slug: "city-shirt",
  name: "City shirt",
  description: "A city-ready shirt",
  category: "Shirts",
  composition: "Cotton",
  careInstructions: null,
  priceMinor: 3500,
  currency: "USD",
  variants: [{
    id: "de20ba56-f507-4c48-847a-958eb13dd7eb", sku: "city-shirt-blue-m",
    color: "Blue", size: "M", stock: 3, priceMinor: 3900,
  }],
  images: [{ color: "Blue", url: "/images/products/oversize-shirt.png", alt: "Blue city shirt", sortOrder: 0 }],
} as const;

describe("live storefront adapter", () => {
  it("maps database UUIDs to stable cart SKUs while keeping variant prices and color photos", () => {
    const product = toCatalogProduct(publicProductSchema.parse(rawProduct));
    expect(product.variants).toEqual([{ id: "city-shirt-blue-m", color: "Blue", size: "M", stock: 3, priceMinor: 3900 }]);
    expect(product.imagesByColor.Blue).toBe("/images/products/oversize-shirt.png");
  });

  it("normalizes a guest cart against the published catalog stock", () => {
    const product = toCatalogProduct(publicProductSchema.parse(rawProduct));
    const cart = normalizeGuestCart([{ variantId: "city-shirt-blue-m", quantity: 9 }], [product]);
    expect(cart).toEqual([{ variantId: "city-shirt-blue-m", quantity: 3 }]);
  });
});
