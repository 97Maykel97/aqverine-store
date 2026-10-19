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
          sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 25vw"
          src={product.image}
        />
      </Link>
      <div className={styles.details}>
        <Link href={`/products/${product.slug}`}>{product.name}</Link>
        <p>{formatPrice(product.price)}</p>
        <span>{product.colors.join(" · ")}</span>
      </div>
    </article>
  );
}
