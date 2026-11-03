import { findPublishedProduct, listPublishedProducts } from "@/features/catalog/api/catalog-service";
import { catalogQuerySchema } from "@/features/catalog/model/catalog-query";
import { getProductBySlug, mockProducts } from "@/features/catalog/model/mock-products";
import { publicProductListSchema, publicProductSchema, toCatalogProduct } from "@/features/catalog/model/public-product";

export async function listStorefrontProducts() {
  if (!process.env.DATABASE_URL) return { products: mockProducts, total: mockProducts.length };
  const query = catalogQuerySchema.parse({ page: 1, limit: 48 });
  const first = publicProductListSchema.parse(await listPublishedProducts(query));
  const pages = Math.ceil(first.pagination.total / query.limit);
  if (pages > 1000) throw new Error("Catalog exceeds supported page count");
  const items = [...first.items];
  for (let page = 2; page <= pages; page += 4) {
    const batch = await Promise.all(Array.from({ length: Math.min(4, pages - page + 1) }, (_, index) =>
      listPublishedProducts({ ...query, page: page + index })));
    for (const result of batch) items.push(...publicProductListSchema.parse(result).items);
  }
  return { products: items.map(toCatalogProduct), total: first.pagination.total };
}

export async function findStorefrontProduct(slug: string) {
  if (!process.env.DATABASE_URL) return getProductBySlug(slug) ?? null;
  const raw = await findPublishedProduct(slug);
  return raw ? toCatalogProduct(publicProductSchema.parse(raw)) : null;
}
