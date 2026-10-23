import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getProductBySlug, mockProducts } from "@/features/catalog/model/mock-products";
import { ProductCard } from "@/features/catalog/ui/ProductCard";
import { ProductPurchasePanel } from "@/features/catalog/ui/ProductPurchasePanel";

import styles from "./page.module.scss";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return mockProducts.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return product ? {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} — AQVERINE`,
      description: product.description,
      url: `/products/${product.slug}`,
      images: [{ url: product.image, alt: product.imageAlt }],
    },
  } : { title: "Товар не найден", robots: { index: false } };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const related = mockProducts.filter((item) => item.id !== product.id).slice(0, 4);

  return (
    <>
      <div className={styles.breadcrumbs}>
        <Link href="/catalog">Каталог</Link><span aria-hidden="true">/</span><span>{product.name}</span>
      </div>
      <Suspense fallback={(
        <div aria-label="Загрузка товара" className={styles.productFallback} role="status">
          <div className={styles.fallbackGallery}>
            <div className={styles.fallbackPhoto} />
            <div className={styles.fallbackThumbnails}><span /><span /><span /></div>
          </div>
          <div className={styles.fallbackDetails}>
            <span className={styles.fallbackLine} />
            <span className={styles.fallbackTitle} />
            <span className={styles.fallbackLine} />
            <span className={styles.fallbackDescription} />
            <span className={styles.fallbackOptions} />
            <span className={styles.fallbackOptions} />
            <span className={styles.fallbackButton} />
          </div>
        </div>
      )}>
        <ProductPurchasePanel product={product} />
      </Suspense>
      <section className={styles.related}>
        <div className={styles.relatedHeading}><h2>СМОТРИ ТАКЖЕ</h2><Link href="/catalog">Весь каталог ↗</Link></div>
        <div className={styles.relatedGrid}>{related.map((item) => <ProductCard key={item.id} product={item} />)}</div>
      </section>
    </>
  );
}
