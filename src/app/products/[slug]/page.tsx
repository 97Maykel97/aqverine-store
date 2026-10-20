import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

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
  return product ? { title: product.name, description: product.description } : { title: "Товар не найден" };
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
      <section className={styles.product}>
        <div className={styles.photo}>
          <Image alt={product.imageAlt} fill priority sizes="(max-width: 800px) 100vw, 52vw" src={product.image} />
        </div>
        <ProductPurchasePanel product={product} />
      </section>
      <section className={styles.related}>
        <div className={styles.relatedHeading}><h2>СМОТРИ ТАКЖЕ</h2><Link href="/catalog">Весь каталог ↗</Link></div>
        <div className={styles.relatedGrid}>{related.map((item) => <ProductCard key={item.id} product={item} />)}</div>
      </section>
    </>
  );
}
