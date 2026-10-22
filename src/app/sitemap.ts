import type { MetadataRoute } from "next";

import { mockProducts } from "@/features/catalog/model/mock-products";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return [
    { url: new URL("/", origin).toString(), changeFrequency: "weekly", priority: 1 },
    { url: new URL("/catalog", origin).toString(), changeFrequency: "daily", priority: 0.9 },
    ...mockProducts.map((product) => ({
      url: new URL(`/products/${product.slug}`, origin).toString(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
