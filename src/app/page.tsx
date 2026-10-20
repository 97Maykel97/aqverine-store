import Image from "next/image";
import Link from "next/link";

import { categories, mockProducts } from "@/features/catalog/model/mock-products";
import { ProductCard } from "@/features/catalog/ui/ProductCard";

import styles from "./page.module.scss";

export default function HomePage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroMedia}>
          <Image
            alt="Две модели AQVERINE в городской одежде на фоне яркой стены"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 57vw"
            src="/images/hero-city.png"
          />
          <span className={styles.heroIndex}>AQVERINE / 01</span>
        </div>
        <div className={styles.heroContent}>
          <h1 id="hero-title">Твой город{" "}<br />твои{" "}<br />правила</h1>
          <p>Одежда для каждого твоего движения.</p>
          <Link className={styles.heroCta} href="/catalog">
            Смотреть коллекцию <span aria-hidden="true">↗</span>
          </Link>
          <span className={styles.heroBottom}>ОДЕЖДА ДЛЯ ЖИЗНИ В ДВИЖЕНИИ</span>
        </div>
      </section>

      <nav className={styles.categoryRail} aria-label="Категории товаров">
        {categories.slice(1).map((category) => (
          <Link href={`/catalog?category=${encodeURIComponent(category.value)}`} key={category.value}>
            {category.label} <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </nav>

      <section className={styles.featured} aria-labelledby="featured-title">
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.sectionNumber}>01 / КОЛЛЕКЦИЯ</span>
            <h2 id="featured-title">ВЫБИРАЮТ СЕЙЧАС</h2>
          </div>
          <Link href="/catalog">Смотреть всё <span aria-hidden="true">↗</span></Link>
        </div>
        <div className={styles.productGrid}>
          {mockProducts.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className={styles.campaign} id="about" aria-labelledby="campaign-title">
        <div className={styles.campaignMedia}>
          <Image
            alt="Две модели в одежде AQVERINE у синей городской стены"
            fill
            sizes="100vw"
            src="/images/campaign-cobalt.png"
          />
        </div>
        <div className={styles.campaignContent}>
          <h2 id="campaign-title">Больше{" "}<br />чем стиль</h2>
          <p>Вещи, которые подстраиваются под твой ритм, а не наоборот.</p>
          <Link href="/catalog">Открыть весь каталог <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    </>
  );
}
