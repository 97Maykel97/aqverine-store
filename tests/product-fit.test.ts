import { describe, expect, it } from "vitest";

import { mockProducts } from "../src/features/catalog/model/mock-products";
import { getProductFitProfile } from "../src/features/catalog/model/product-fit";

describe("product fit profiles", () => {
  it("covers every sellable size of every catalog product", () => {
    for (const product of mockProducts) {
      const profile = getProductFitProfile(product.slug);
      expect(profile, product.slug).toBeDefined();
      if (!profile) throw new Error(`Missing fit profile for ${product.slug}`);
      const catalogSizes = new Set(product.variants.map((variant) => variant.size));
      expect(new Set(profile.measurements.map((row) => row.size))).toEqual(catalogSizes);
      for (const row of profile.measurements) {
        expect(row.values).toHaveLength(profile.columns.length);
        expect(row.values.every((value) => Number.isFinite(value) && value > 0)).toBe(true);
      }
    }
  });

  it("does not substitute another product's measurements for an unknown product", () => {
    expect(getProductFitProfile("unknown-product")).toBeUndefined();
  });

  it("explains how width, length and sleeve are measured", () => {
    for (const product of mockProducts.filter((entry) => entry.category !== "Trousers" && entry.category !== "Accessories")) {
      const profile = getProductFitProfile(product.slug);
      expect(profile?.columns[0]).toBe("Ширина по груди");
      expect(profile?.measurementTip).toContain("от подмышки до подмышки");
      expect(profile?.measurementTip).toContain("длина — от верхней точки плеча до низа");
      expect(profile?.measurementTip).toContain("рукав — от плечевого шва");
    }
  });
});
