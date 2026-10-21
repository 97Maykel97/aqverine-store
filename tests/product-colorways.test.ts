import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { getProductImage, mockProducts } from "../src/features/catalog/model/mock-products";

describe("product color imagery", () => {
  it("has a real local photo for every selectable color", () => {
    for (const product of mockProducts) {
      for (const color of product.colors) {
        const { src, alt } = getProductImage(product, color);
        expect(product.imagesByColor[color]).toBe(src);
        expect(existsSync(join(process.cwd(), "public", src))).toBe(true);
        expect(alt).toContain(product.name);
      }
      expect(new Set(product.variants.map((variant) => variant.color))).toEqual(new Set(product.colors));
    }
  });

  it("keeps existing variant IDs stable while adding the blue T-shirt", () => {
    const shirt = mockProducts.find((product) => product.id === "essential-t-shirt");
    expect(shirt?.variants.find((variant) => variant.color === "Графит" && variant.size === "M")?.id).toBe("essential-t-shirt-2-M");
    expect(shirt?.variants.find((variant) => variant.color === "Синий" && variant.size === "M")?.id).toBe("essential-t-shirt-3-M");
  });
});
