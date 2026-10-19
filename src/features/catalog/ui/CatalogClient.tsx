"use client";

import { useMemo, useState } from "react";

import { ProductCard } from "@/features/catalog/ui/ProductCard";
import type { CatalogProduct, ProductCategory } from "@/shared/types/catalog";

import styles from "./CatalogClient.module.scss";

const categories: ReadonlyArray<{ label: string; value: ProductCategory | "All" }> = [
  { label: "Все", value: "All" },
  { label: "Футболки", value: "T-shirts" },
  { label: "Худи", value: "Hoodies" },
  { label: "Рубашки", value: "Shirts" },
  { label: "Брюки", value: "Trousers" },
  { label: "Верхняя одежда", value: "Outerwear" },
  { label: "Аксессуары", value: "Accessories" },
];

interface CatalogClientProps {
  products: readonly CatalogProduct[];
}

export function CatalogClient({ products }: CatalogClientProps) {
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "All">("All");
  const filteredProducts = useMemo(
    () =>
      activeCategory === "All"
        ? products
        : products.filter((product) => product.category === activeCategory),
    [activeCategory, products],
  );

  return (
    <>
      <div className={styles.controls}>
        <div className={styles.filters} aria-label="Категории каталога">
          {categories.map((category) => (
            <button
              aria-pressed={activeCategory === category.value}
              className={activeCategory === category.value ? styles.active : undefined}
              key={category.value}
              onClick={() => setActiveCategory(category.value)}
              type="button"
            >
              {category.label}
            </button>
          ))}
        </div>
        <p aria-live="polite">{filteredProducts.length} предметов</p>
      </div>
      {filteredProducts.length > 0 ? (
        <div className={styles.grid}>
          {filteredProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 2} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>В этой категории пока нет товаров.</p>
          <button type="button" onClick={() => setActiveCategory("All")}>
            Показать все
          </button>
        </div>
      )}
    </>
  );
}
