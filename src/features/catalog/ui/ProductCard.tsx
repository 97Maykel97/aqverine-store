import Image from "next/image";
import Link from "next/link";

import { formatPrice } from "@/features/catalog/model/mock-products";
import type { CatalogProduct } from "@/shared/types/catalog";

import styles from "./ProductCard.module.scss";

interface ProductCardProps {
  product: CatalogProduct;
  priority?: boolean;
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  return (
    <article className={styles.card}>
      <Link className={styles.imageLink} href={`/products/${product.slug}`}>
        <Image
          alt={product.imageAlt}
          className={styles.image}
          fill
          priority={priority}
          sizes="(max-width: 700px) 46vw, (max-width: 1100px) 46vw, 23vw"
          src={product.image}
        />
        <span className={styles.imageAction}>Смотреть товар <span aria-hidden="true">↗</span></span>
      </Link>
      <div className={styles.details}>
        <div>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
          <strong>{formatPrice(product.price)}</strong>
        </div>
        <p>{product.colors.join(" / ")}</p>
      </div>
    </article>
  );
}
