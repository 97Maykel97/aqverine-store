"use client";

import Link from "next/link";
import { useState } from "react";

import { categories } from "@/features/catalog/model/mock-products";
import { ProductCard } from "@/features/catalog/ui/ProductCard";
import type { CatalogProduct, ProductCategory } from "@/shared/types/catalog";

import styles from "./CatalogClient.module.scss";

const productCountForms = { zero: "товаров", one: "товар", two: "товара", few: "товара", many: "товаров", other: "товаров" } as const;
const productCountRules = new Intl.PluralRules("ru-RU");

interface CatalogClientProps {
  products: readonly CatalogProduct[];
  initialCategory: ProductCategory | "All";
  query: string;
}

export function CatalogClient({ products, initialCategory, query }: CatalogClientProps) {
  const [activeCategory, setActiveCategory] = useState<ProductCategory | "All">(initialCategory);
  const normalizedQuery = query.toLocaleLowerCase("ru-RU");
  const filteredProducts = products.filter(
    (product) =>
      (activeCategory === "All" || product.category === activeCategory) &&
      (!normalizedQuery || product.name.toLocaleLowerCase("ru-RU").includes(normalizedQuery)),
  );

  return (
    <>
      <div className={styles.controls}>
        <div className={styles.filters} role="group" aria-label="Категории каталога">
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
        <p aria-live="polite">{filteredProducts.length} {productCountForms[productCountRules.select(filteredProducts.length)]}</p>
      </div>
      {query ? <p className={styles.searchInfo}>Результаты поиска: «{query}»</p> : null}
      {filteredProducts.length > 0 ? (
        <div className={styles.grid}>
          {filteredProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 2} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <h2>Ничего не найдено</h2>
          <p>Попробуй другую категорию или запрос.</p>
          <Link href="/catalog">Показать все товары ↗</Link>
        </div>
      )}
    </>
  );
}
