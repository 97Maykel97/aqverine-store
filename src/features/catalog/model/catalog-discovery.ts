import { categories } from "@/features/catalog/model/mock-products";
import type { CatalogProduct, ProductCategory } from "@/shared/types/catalog";

export type CatalogSort = "featured" | "price-asc" | "price-desc" | "name";

export interface CatalogFilters {
  category: ProductCategory | "All";
  color: string | null;
  size: string | null;
  maxPrice: number;
  query: string;
  sort: CatalogSort;
}

const normalize = (value: string): string => value.trim().toLocaleLowerCase("ru-RU");

export function searchProducts(products: readonly CatalogProduct[], query: string): CatalogProduct[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...products];

  return products
    .filter((product) => {
      const category = categories.find((item) => item.value === product.category)?.label ?? "";
      const searchable = normalize(`${product.name} ${category}`);
      return words.every((word) => searchable.includes(word));
    })
    .sort((first, second) => {
      const firstStarts = Number(normalize(first.name).startsWith(words[0]));
      const secondStarts = Number(normalize(second.name).startsWith(words[0]));
      return secondStarts - firstStarts;
    });
}

export function filterCatalogProducts(products: readonly CatalogProduct[], filters: CatalogFilters): CatalogProduct[] {
  const matches = searchProducts(products, filters.query).filter((product) =>
    (filters.category === "All" || product.category === filters.category) &&
    (!filters.color || product.colors.includes(filters.color)) &&
    (!filters.size || product.variants.some((variant) => variant.size === filters.size && variant.stock > 0)) &&
    product.price <= filters.maxPrice,
  );

  if (filters.sort === "price-asc") return matches.sort((first, second) => first.price - second.price);
  if (filters.sort === "price-desc") return matches.sort((first, second) => second.price - first.price);
  if (filters.sort === "name") return matches.sort((first, second) => first.name.localeCompare(second.name, "ru-RU"));
  return matches;
}
