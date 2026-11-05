import { z } from "zod";

import type { CatalogProduct } from "@/shared/types/catalog";

export const publicProductSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.enum(["T-shirts", "Hoodies", "Shirts", "Trousers", "Outerwear", "Accessories"]),
  composition: z.string().nullable(),
  careInstructions: z.string().nullable(),
  priceMinor: z.number().int().positive(),
  currency: z.literal("USD"),
  variants: z.array(z.object({
    id: z.uuid(), sku: z.string(), color: z.string(), size: z.string(),
    stock: z.number().int().nonnegative(), priceMinor: z.number().int().positive(),
  })),
  images: z.array(z.object({ color: z.string().nullable(), url: z.string().nullable(), alt: z.string(), sortOrder: z.number() })),
});

export const publicProductListSchema = z.object({
  items: z.array(publicProductSchema),
  pagination: z.object({ page: z.number(), limit: z.number(), total: z.number() }),
});

export type PublicProduct = z.infer<typeof publicProductSchema>;

export function toCatalogProduct(raw: PublicProduct): CatalogProduct {
  const photos = raw.images.filter((image): image is typeof image & { url: string } => Boolean(image.url));
  const first = photos[0];
  if (!first) throw new Error("Published product has no public image");
  const colors = [...new Set(raw.variants.map((variant) => variant.color))];
  const imagesByColor = Object.fromEntries(photos.filter((image) => image.color).map((image) => [image.color, image.url]));
  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    description: raw.description,
    category: raw.category,
    composition: raw.composition ?? "",
    careInstructions: raw.careInstructions?.trim() || undefined,
    price: raw.priceMinor,
    colors,
    image: first.url,
    imageAlt: first.alt,
    imagesByColor,
    variants: raw.variants.map((variant) => ({
      id: variant.sku,
      color: variant.color,
      size: variant.size,
      stock: variant.stock,
      priceMinor: variant.priceMinor,
    })),
  };
}
