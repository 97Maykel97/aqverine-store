import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as listProducts } from "@/app/api/products/route";
import { GET as getProduct } from "@/app/api/products/[slug]/route";
import { parseCatalogQuery } from "@/features/catalog/model/catalog-query";

afterEach(() => vi.unstubAllEnvs());

describe("public catalog API boundary", () => {
  it("rejects invalid and ambiguous filters", () => {
    expect(parseCatalogQuery(new URLSearchParams("category=Unknown")).success).toBe(false);
    expect(parseCatalogQuery(new URLSearchParams("page=1&page=2")).success).toBe(false);
    expect(parseCatalogQuery(new URLSearchParams("limit=49")).success).toBe(false);
  });

  it("returns safe responses while the database is not configured", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const invalid = await listProducts(new NextRequest("http://localhost/api/products?sort=random"));
    const unavailable = await listProducts(new NextRequest("http://localhost/api/products?category=T-shirts"));
    const invalidProduct = await getProduct(new Request("http://localhost/api/products/bad"), {
      params: Promise.resolve({ slug: "BAD SLUG" }),
    });
    const unavailableProduct = await getProduct(new Request("http://localhost/api/products/essential-t-shirt"), {
      params: Promise.resolve({ slug: "essential-t-shirt" }),
    });

    expect(invalid.status).toBe(400);
    expect(unavailable.status).toBe(503);
    expect(invalidProduct.status).toBe(400);
    expect(unavailableProduct.status).toBe(503);
    expect(JSON.stringify(await unavailable.json())).not.toContain("DATABASE_URL");
  });
});
