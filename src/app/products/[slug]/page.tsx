import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { listPublishedProductSlugs } from "@/features/catalog/api/catalog-service";
import { listStorefrontProducts, findStorefrontProduct } from "@/features/catalog/api/storefront-service";
import { mockProducts } from "@/features/catalog/model/mock-products";
import { ProductCard } from "@/features/catalog/ui/ProductCard";
import { ProductPurchasePanel } from "@/features/catalog/ui/ProductPurchasePanel";

import styles from "./page.module.scss";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  if (!process.env.DATABASE_URL) return mockProducts.map((product) => ({ slug: product.slug }));

  const [product] = await listPublishedProductSlugs(1);
  return [{ slug: product?.slug ?? "__build_validation__" }];
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await findStorefrontProduct(slug);
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

export default function ProductPage({ params }: ProductPageProps) {
  return <Suspense fallback={<div className={styles.productFallback} role="status">Загружаем товар…</div>}><ProductContent params={params} /></Suspense>;
}

async function ProductContent({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await findStorefrontProduct(slug);
  if (!product) notFound();
  const related = (await listStorefrontProducts()).products.filter((item) => item.id !== product.id).slice(0, 4);

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
