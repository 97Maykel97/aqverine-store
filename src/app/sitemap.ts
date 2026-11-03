import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { listPublishedProductSlugs } from "@/features/catalog/api/catalog-service";
import { mockProducts } from "@/features/catalog/model/mock-products";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (process.env.DATABASE_URL) await connection();
  const slugs = process.env.DATABASE_URL
    ? await listPublishedProductSlugs() : mockProducts.map((product) => ({ slug: product.slug }));

  return [
    { url: new URL("/", origin).toString(), changeFrequency: "weekly", priority: 1 },
    { url: new URL("/catalog", origin).toString(), changeFrequency: "daily", priority: 0.9 },
    ...slugs.map((product) => ({
      url: new URL(`/products/${product.slug}`, origin).toString(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
