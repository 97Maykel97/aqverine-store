import { describe, expect, it } from "vitest";

import {
  findCartVariant,
  normalizeGuestCart,
  setGuestCartQuantity,
} from "../src/features/cart/model/guest-cart";

const variantId = "essential-t-shirt-0-M";

describe("guest cart", () => {
  it("rejects malformed stored data", () => {
    expect(normalizeGuestCart(null)).toEqual([]);
    expect(normalizeGuestCart([{ variantId, quantity: -1 }])).toEqual([]);
    expect(normalizeGuestCart([{ variantId, quantity: 1.5 }])).toEqual([]);
  });

  it("merges duplicate variants and caps the result at available stock", () => {
    const stock = findCartVariant(variantId)?.variant.stock;
    expect(stock).toBe(8);
    expect(normalizeGuestCart([
      { variantId, quantity: 5 },
      { variantId, quantity: 5 },
      { variantId: "unknown", quantity: 1 },
    ])).toEqual([{ variantId, quantity: stock }]);
  });

  it("caps quantity, removes zero quantity, and ignores unknown variants", () => {
    const cart = setGuestCartQuantity([], variantId, 100);
    expect(cart).toEqual([{ variantId, quantity: 8 }]);
    expect(setGuestCartQuantity(cart, variantId, 0)).toEqual([]);
    expect(setGuestCartQuantity(cart, "unknown", 2)).toEqual(cart);
  });
});
