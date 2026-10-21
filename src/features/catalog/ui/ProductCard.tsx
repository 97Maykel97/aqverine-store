"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { formatPrice, getProductImage } from "@/features/catalog/model/mock-products";
import { productColorValues } from "@/features/catalog/model/product-colors";
import type { CatalogProduct } from "@/shared/types/catalog";

import styles from "./ProductCard.module.scss";

interface ProductCardProps {
  product: CatalogProduct;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const [color, setColor] = useState(product.colors[0]);
  const image = getProductImage(product, color);
  const href = `/products/${product.slug}?color=${encodeURIComponent(color)}`;

  return (
    <article className={styles.card}>
      <Link aria-label={`${product.name}, цвет ${color}`} className={styles.imageLink} href={href}>
        <Image
          alt={image.alt}
          className={styles.image}
          fill
          priority={priority}
          sizes="(max-width: 700px) 46vw, (max-width: 1100px) 46vw, (max-width: 1600px) 31vw, 450px"
          src={image.src}
        />
        <span className={styles.imageAction}>Смотреть товар <span aria-hidden="true">↗</span></span>
      </Link>
      <div className={styles.details}>
        <div>
          <Link href={href}>{product.name}</Link>
          <strong>{formatPrice(product.price)}</strong>
        </div>
        <div aria-label="Варианты цвета" className={styles.swatches} role="group">
          {product.colors.map((item) => (
            <button
              aria-label={`${product.name}: ${item}`}
              aria-pressed={color === item}
              className={color === item ? styles.selectedSwatch : undefined}
              key={item}
              onClick={() => setColor(item)}
              style={{ "--swatch-color": productColorValues[item] ?? "#888" } as React.CSSProperties}
              title={item}
              type="button"
            ><span /></button>
          ))}
          <span className={styles.colorName}>{color}</span>
        </div>
      </div>
    </article>
  );
}
