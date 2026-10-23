"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { filterCatalogProducts, type CatalogFilters as CatalogFilterState, type CatalogSort } from "@/features/catalog/model/catalog-discovery";
import { ProductCard } from "@/features/catalog/ui/ProductCard";
import { CatalogFilters } from "@/features/catalog/ui/CatalogFilters";
import type { CatalogProduct, ProductCategory } from "@/shared/types/catalog";

import styles from "./CatalogClient.module.scss";

const countForms = { zero: "товаров", one: "товар", two: "товара", few: "товара", many: "товаров", other: "товаров" } as const;
const pluralRules = new Intl.PluralRules("ru-RU");

interface CatalogClientProps {
  products: readonly CatalogProduct[];
  initialCategory: ProductCategory | "All";
  query: string;
}

export function CatalogClient({ products, initialCategory, query }: CatalogClientProps) {
  const maximumPrice = Math.max(...products.map((product) => product.price));
  const colors = Array.from(new Set(products.flatMap((product) => product.colors)));
  const sizes = ["S", "M", "L", "XL", "ONE SIZE"].filter((size) => products.some((product) => product.variants.some((variant) => variant.size === size)));
  const [filters, setFilters] = useState<CatalogFilterState>({ category: initialCategory, color: null, size: null, maxPrice: maximumPrice, query, sort: "featured" });
  const [isFilterOpen, setFilterOpen] = useState(false);
  const filterDialogRef = useRef<HTMLDialogElement>(null);
  const filteredProducts = filterCatalogProducts(products, filters);
  const filterCount = Number(filters.category !== "All") + Number(Boolean(filters.color)) + Number(Boolean(filters.size)) + Number(filters.maxPrice < maximumPrice);
  const countLabel = `${filteredProducts.length} ${countForms[pluralRules.select(filteredProducts.length)]}`;

  useEffect(() => {
    const dialog = filterDialogRef.current;
    if (!dialog || !isFilterOpen) return;
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); };
  }, [isFilterOpen]);

  function resetFilters() {
    setFilters({ category: "All", color: null, size: null, maxPrice: maximumPrice, query, sort: filters.sort });
  }

  const filterProps = { filters, colors, sizes, maximumPrice, resultCount: filteredProducts.length, onChange: setFilters, onReset: resetFilters };

  return (
    <>
      {query ? <div className={styles.searchInfo}><span>Результаты поиска: «{query}»</span><Link href="/catalog">Очистить поиск ×</Link></div> : null}
      <div className={styles.layout}>
        <aside aria-label="Фильтры каталога" className={styles.desktopFilters}><CatalogFilters {...filterProps} /></aside>
        <div className={styles.results}>
          <div className={styles.toolbar}>
            <p aria-live="polite">Найдено: <strong>{countLabel}</strong></p>
            <div className={styles.toolbarActions}>
              <label htmlFor="catalog-sort">Сортировка</label>
              <select id="catalog-sort" onChange={(event) => setFilters({ ...filters, sort: event.target.value as CatalogSort })} value={filters.sort}>
                <option value="featured">По умолчанию</option>
                <option value="price-asc">Сначала дешевле</option>
                <option value="price-desc">Сначала дороже</option>
                <option value="name">По названию</option>
              </select>
              <button className={styles.mobileFilterToggle} onClick={() => setFilterOpen(true)} type="button">Фильтры {filterCount > 0 ? <span>{filterCount}</span> : null}<b aria-hidden="true">☷</b></button>
            </div>
          </div>
          {filterCount > 0 ? (
            <div className={styles.activeFilters}>
              {filters.category !== "All" ? <button onClick={() => setFilters({ ...filters, category: "All" })} type="button">Категория ×</button> : null}
              {filters.color ? <button onClick={() => setFilters({ ...filters, color: null })} type="button">{filters.color} ×</button> : null}
              {filters.size ? <button onClick={() => setFilters({ ...filters, size: null })} type="button">{filters.size} ×</button> : null}
              {filters.maxPrice < maximumPrice ? <button onClick={() => setFilters({ ...filters, maxPrice: maximumPrice })} type="button">До ${filters.maxPrice / 100} ×</button> : null}
              <button className={styles.clearAll} onClick={resetFilters} type="button">Сбросить всё</button>
            </div>
          ) : null}
          {filteredProducts.length > 0 ? (
            <div className={styles.grid}>{filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 2} />)}</div>
          ) : (
            <div className={styles.empty}><span aria-hidden="true">↗</span><h2>Пока без совпадений</h2><p>Попробуй другой цвет, размер или цену.</p><button onClick={resetFilters} type="button">Сбросить фильтры</button></div>
          )}
        </div>
      </div>
      <dialog aria-label="Фильтры каталога" className={styles.mobileFilterDialog} onClick={(event) => { if (event.target === filterDialogRef.current) setFilterOpen(false); }} onClose={() => setFilterOpen(false)} ref={filterDialogRef}>
        <div className={styles.mobileFilterContent}>
          <CatalogFilters {...filterProps} onApply={() => setFilterOpen(false)} onClose={() => setFilterOpen(false)} />
        </div>
      </dialog>
    </>
  );
}
