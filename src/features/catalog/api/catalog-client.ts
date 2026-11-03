import { publicProductListSchema, toCatalogProduct } from "@/features/catalog/model/public-product";

export async function fetchStorefrontProducts() {
  async function fetchPage(page: number) {
    const response = await fetch(`/api/products?limit=48&page=${page}`, { cache: "no-store" });
    if (!response.ok) throw new Error("CATALOG_UNAVAILABLE");
    return publicProductListSchema.parse(await response.json() as unknown);
  }
  const first = await fetchPage(1);
  const pages = Math.ceil(first.pagination.total / 48);
  if (pages > 1000) throw new Error("CATALOG_TOO_LARGE");
  const items = [...first.items];
  for (let page = 2; page <= pages; page += 4) {
    const batch = await Promise.all(Array.from({ length: Math.min(4, pages - page + 1) }, (_, index) => fetchPage(page + index)));
    for (const result of batch) items.push(...result.items);
  }
  return items.map(toCatalogProduct);
}
