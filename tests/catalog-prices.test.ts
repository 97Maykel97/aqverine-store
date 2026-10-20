import { describe, expect, it } from "vitest";

import { formatPrice, mockProducts } from "../src/features/catalog/model/mock-products";

describe("catalog prices", () => {
  it("stores demo USD prices in integer cents", () => {
    expect(mockProducts.every((product) => Number.isInteger(product.price))).toBe(true);
    expect(mockProducts.every((product) => product.price > 0)).toBe(true);
  });

  it("formats product and cart totals in dollars", () => {
    expect(formatPrice(2900)).toBe("$29");
    expect(formatPrice(2950)).toBe("$29.50");
    expect(formatPrice(2900 * 2 + 1900)).toBe("$77");
  });
});
