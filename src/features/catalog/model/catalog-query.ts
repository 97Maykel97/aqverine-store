import { z } from "zod";

const category = z.enum(["T-shirts", "Hoodies", "Shirts", "Trousers", "Outerwear", "Accessories"]);

export const catalogQuerySchema = z.object({
  category: category.optional(),
  color: z.string().trim().min(1).max(40).optional(),
  size: z.string().trim().min(1).max(20).optional(),
  q: z.string().trim().max(80).optional(),
  sort: z.enum(["newest", "price-asc", "price-desc", "name"]).default("newest"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
}).strict();

export const productSlugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);

export type CatalogQuery = z.infer<typeof catalogQuerySchema>;

export function parseCatalogQuery(searchParams: URLSearchParams) {
  const raw: Record<string, string> = {};
  for (const [key, value] of searchParams) {
    if (key in raw) return catalogQuerySchema.safeParse(null);
    raw[key] = value;
  }
  return catalogQuerySchema.safeParse(raw);
}
