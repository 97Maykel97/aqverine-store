"use client";

import type { RefObject } from "react";

import { getProductFitProfile } from "@/features/catalog/model/product-fit";
import type { CatalogProduct } from "@/shared/types/catalog";

import styles from "./ProductFitGuide.module.scss";

interface ProductFitGuideProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  product: CatalogProduct;
  color: string;
  selectedSize: string | null;
  onSelectSize: (size: string) => void;
}

export function ProductFitGuide({ dialogRef, product, color, selectedSize, onSelectSize }: ProductFitGuideProps) {
  const profile = getProductFitProfile(product.slug);
  if (!profile) return null;

  return (
    <dialog
      aria-label={`Размеры и посадка: ${product.name}`}
      className={styles.dialog}
      onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current.close(); }}
      ref={dialogRef}
    >
      <div className={styles.header}>
        <span>ПОСАДКА / AQVERINE</span>
        <form method="dialog"><button aria-label="Закрыть таблицу размеров" className={styles.close} type="submit">×</button></form>
      </div>
      <h2>Найди свой размер</h2>
      <p className={styles.productName}>{product.name}</p>
      <p className={styles.fit}>{profile.fit}</p>
      <div className={styles.tableHeading}>
        <strong>Ориентировочные замеры, см</strong>
        <span>По изделию, не по телу</span>
      </div>
      <p className={styles.mobileHint}>Листай таблицу вправо →</p>
      <div aria-label="Таблица размеров, прокрутите горизонтально при необходимости" className={styles.tableScroll} role="region" tabIndex={0}>
        <table>
          <thead><tr><th scope="col">Размер</th>{profile.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
          <tbody>
            {profile.measurements.map((row) => {
              const available = product.variants.some((variant) => variant.color === color && variant.size === row.size && variant.stock > 0);
              return (
                <tr className={selectedSize === row.size ? styles.selected : undefined} key={row.size}>
                  <th scope="row">
                    <button
                      aria-label={`Выбрать размер ${row.size}${available ? "" : ", нет в наличии"}`}
                      aria-pressed={selectedSize === row.size}
                      disabled={!available}
                      onClick={() => { onSelectSize(row.size); dialogRef.current?.close(); }}
                      type="button"
                    >{row.size}</button>
                  </th>
                  {row.values.map((value, index) => <td key={profile.columns[index]}>{value}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className={styles.measurementTip}>{profile.measurementTip}</p>
      <p className={styles.disclaimer}>Значения ориентировочные и могут отличаться от фактических замеров изделия.</p>
      <button className={styles.back} onClick={() => dialogRef.current?.close()} type="button">Вернуться к товару <span aria-hidden="true">↗</span></button>
    </dialog>
  );
}
