"use client";

import { useId } from "react";

import type { CatalogFilters as CatalogFilterState } from "@/features/catalog/model/catalog-discovery";
import { categories, formatPrice } from "@/features/catalog/model/mock-products";
import { productColorValues } from "@/features/catalog/model/product-colors";

import styles from "./CatalogFilters.module.scss";

interface CatalogFiltersProps {
  filters: CatalogFilterState;
  colors: readonly string[];
  sizes: readonly string[];
  maximumPrice: number;
  resultCount: number;
  onChange: (filters: CatalogFilterState) => void;
  onReset: () => void;
  onApply?: () => void;
  onClose?: () => void;
}

export function CatalogFilters({ filters, colors, sizes, maximumPrice, resultCount, onChange, onReset, onApply, onClose }: CatalogFiltersProps) {
  const priceId = useId();

  return (
    <div className={styles.panel}>
      <div className={styles.heading}><h2>Фильтры</h2><div><button onClick={onReset} type="button">Сбросить</button>{onClose ? <button aria-label="Закрыть фильтры" className={styles.close} onClick={onClose} type="button">×</button> : null}</div></div>
      <fieldset className={styles.group}>
        <legend>Категория</legend>
        <div className={styles.categoryList}>
          {categories.map((category) => (
            <button aria-pressed={filters.category === category.value} className={filters.category === category.value ? styles.selectedCategory : undefined} key={category.value} onClick={() => onChange({ ...filters, category: category.value })} type="button">
              <span>{category.label}</span><span aria-hidden="true">{filters.category === category.value ? "●" : "↗"}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Цвет</legend>
        <div className={styles.colors}>
          {colors.map((color) => (
            <button aria-pressed={filters.color === color} className={filters.color === color ? styles.selectedColor : undefined} key={color} onClick={() => onChange({ ...filters, color: filters.color === color ? null : color })} type="button">
              <span className={styles.swatch} style={{ background: productColorValues[color] ?? "#888" }} />{color}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className={styles.group}>
        <legend>Размер</legend>
        <div className={styles.sizes}>
          {sizes.map((size) => <button aria-pressed={filters.size === size} className={filters.size === size ? styles.selectedSize : undefined} key={size} onClick={() => onChange({ ...filters, size: filters.size === size ? null : size })} type="button">{size}</button>)}
        </div>
      </fieldset>
      <div className={styles.priceGroup}>
        <div><label htmlFor={priceId}>Цена до</label><strong>{formatPrice(filters.maxPrice)}</strong></div>
        <input id={priceId} max={maximumPrice} min="1900" onChange={(event) => onChange({ ...filters, maxPrice: Number(event.target.value) })} step="100" type="range" value={filters.maxPrice} />
        <div className={styles.priceEnds}><span>$19</span><span>{formatPrice(maximumPrice)}</span></div>
      </div>
      {onApply ? <button className={styles.apply} onClick={onApply} type="button">Показать товары · {resultCount} <span aria-hidden="true">↗</span></button> : null}
    </div>
  );
}
