import { describe, expect, it } from "vitest";

import { filterCatalogProducts, searchProducts, type CatalogFilters } from "@/features/catalog/model/catalog-discovery";
import { mockProducts } from "@/features/catalog/model/mock-products";

const defaultFilters: CatalogFilters = {
  category: "All",
  color: null,
  size: null,
  maxPrice: 9900,
  query: "",
  sort: "featured",
};

describe("catalog discovery", () => {
  it("suggests products while a partial name is typed", () => {
    expect(searchProducts(mockProducts, "фут").map((product) => product.slug)).toEqual(["essential-t-shirt"]);
    expect(searchProducts(mockProducts, "ХУДИ").map((product) => product.slug)).toEqual(["everyday-hoodie"]);
  });

  it("combines category, color, size and price without changing the source array", () => {
    const originalFirst = mockProducts[0];
    const matches = filterCatalogProducts(mockProducts, {
      ...defaultFilters,
      category: "T-shirts",
      color: "Синий",
      size: "XL",
      maxPrice: 3000,
    });
    expect(matches.map((product) => product.slug)).toEqual(["essential-t-shirt"]);
    expect(mockProducts[0]).toBe(originalFirst);
    expect(filterCatalogProducts(mockProducts, { ...defaultFilters, maxPrice: 2000 }).map((product) => product.slug)).toEqual(["canvas-tote"]);
  });

  it("sorts matched products by price", () => {
    expect(filterCatalogProducts(mockProducts, { ...defaultFilters, sort: "price-asc" })[0]?.price).toBe(1900);
    expect(filterCatalogProducts(mockProducts, { ...defaultFilters, sort: "price-desc" })[0]?.price).toBe(9900);
  });
});
