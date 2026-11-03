import { afterEach, describe, expect, it, vi } from "vitest";

import { listStorefrontProducts } from "@/features/catalog/api/storefront-service";

const database = vi.hoisted(() => ({ list: vi.fn(), find: vi.fn() }));
vi.mock("@/features/catalog/api/catalog-service", () => ({
  listPublishedProducts: database.list,
  findPublishedProduct: database.find,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("database storefront", () => {
  it("shows published database products when PostgreSQL is configured", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://configured.example/test");
    database.list.mockResolvedValue({
      items: [{
        id: "b94d5afe-46d1-4aeb-998d-f09125e516ea", slug: "city-shirt", name: "City shirt",
        description: "A city-ready shirt", category: "Shirts", composition: null,
        careInstructions: null, priceMinor: 3500, currency: "USD",
        variants: [{ id: "de20ba56-f507-4c48-847a-958eb13dd7eb", sku: "city-shirt-blue-m", color: "Blue", size: "M", stock: 3, priceMinor: 3900 }],
        images: [{ color: "Blue", url: "/images/products/oversize-shirt.png", alt: "Blue city shirt", sortOrder: 0 }],
      }],
      pagination: { page: 1, limit: 48, total: 1 },
    });

    const result = await listStorefrontProducts();
    expect(result.products.map((product) => product.slug)).toEqual(["city-shirt"]);
    expect(database.list).toHaveBeenCalledWith({ page: 1, limit: 48, sort: "newest" });
  });
});
