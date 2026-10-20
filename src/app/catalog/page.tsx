import type { Metadata } from "next";

import { categories, mockProducts } from "@/features/catalog/model/mock-products";
import { CatalogClient } from "@/features/catalog/ui/CatalogClient";

import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Каталог",
  description: "Каталог городской одежды AQVERINE.",
};

interface CatalogPageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const { category, q } = await searchParams;
  const initialCategory = categories.find((item) => item.value === category)?.value ?? "All";
  const query = typeof q === "string" ? q.trim().slice(0, 80) : "";

  return (
    <section className={styles.catalog}>
      <div className={styles.intro}>
        <div>
          <span>КАТАЛОГ / {mockProducts.length} ВЕЩЕЙ</span>
          <h1>ВЕЩИ ДЛЯ<br />ТВОЕГО РИТМА.</h1>
        </div>
        <p>Найди свой силуэт. Собери гардероб, который двигается вместе с тобой.</p>
      </div>
      <CatalogClient key={`${initialCategory}-${query}`} initialCategory={initialCategory} products={mockProducts} query={query} />
    </section>
  );
}
