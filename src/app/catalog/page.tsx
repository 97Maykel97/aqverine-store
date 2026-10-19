import type { Metadata } from "next";

import { mockProducts } from "@/features/catalog/model/mock-products";
import { CatalogClient } from "@/features/catalog/ui/CatalogClient";

import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Каталог",
  description: "Каталог городской одежды AQVERINE.",
};

export default function CatalogPage() {
  return (
    <section className={styles.catalog}>
      <h1>Каталог</h1>
      <CatalogClient products={mockProducts} />
    </section>
  );
}
