import Image from "next/image";
import Link from "next/link";

import { mockProducts } from "@/features/catalog/model/mock-products";
import { ProductCard } from "@/features/catalog/ui/ProductCard";

import styles from "./page.module.scss";

const categories = ["Верхняя одежда", "Трикотаж", "Рубашки", "Брюки", "Аксессуары"] as const;

export default function HomePage() {
  return (
    <>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>Одежда для города, который не стоит на месте.</h1>
          <Link className={styles.primaryLink} href="/catalog">
            Смотреть каталог
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className={styles.heroMedia}>
          <Image
            alt="Модель в тёмном пальто в городском пространстве"
            fill
            priority
            sizes="(max-width: 800px) 100vw, 58vw"
            src="/images/aqverine-hero.png"
          />
        </div>
      </section>

      <section className={styles.collection}>
        <div className={styles.categoryRow}>
          <h2>Новая форма повседневности</h2>
          <div>
            {categories.map((category) => (
              <Link href="/catalog" key={category}>
                {category}
              </Link>
            ))}
          </div>
        </div>
        <div className={styles.productGrid}>
          {mockProducts.slice(0, 4).map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 2} />
          ))}
        </div>
      </section>

      <section className={styles.notes} aria-label="Принципы AQVERINE">
        <article>
          <span className={styles.noteMark} aria-hidden="true">01</span>
          <h2>Натуральные материалы</h2>
          <p>Выбираем ткани, которые остаются комфортными в течение всего дня.</p>
        </article>
        <article>
          <span className={styles.noteMark} aria-hidden="true">02</span>
          <h2>Продуманные детали</h2>
          <p>Функциональность в каждой вещи — без лишнего и случайного.</p>
        </article>
        <article>
          <span className={styles.noteMark} aria-hidden="true">03</span>
          <h2>Современная классика</h2>
          <p>Вещи, которые органично становятся частью вашего гардероба.</p>
        </article>
      </section>
    </>
  );
}
