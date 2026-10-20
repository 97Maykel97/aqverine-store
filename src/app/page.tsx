import Image, { getImageProps } from "next/image";
import Link from "next/link";

import { categories, mockProducts } from "@/features/catalog/model/mock-products";
import { ProductCard } from "@/features/catalog/ui/ProductCard";

import styles from "./page.module.scss";

const heroAlt = "Две модели AQVERINE в городской одежде на фоне яркой стены";
const { props: { srcSet: desktopHeroSrcSet } } = getImageProps({
  alt: heroAlt,
  src: "/images/hero-city.png",
  width: 1586,
  height: 992,
  sizes: "(min-width: 1200px) 57vw, 100vw",
  loading: "eager",
});
const { props: mobileHeroProps } = getImageProps({
  alt: heroAlt,
  src: "/images/hero-city-mobile.png",
  width: 1122,
  height: 1402,
  sizes: "100vw",
  loading: "eager",
});

export default function HomePage() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroMedia}>
          <picture>
            <source media="(min-width: 681px)" srcSet={desktopHeroSrcSet} />
            <img {...mobileHeroProps} alt={heroAlt} className={styles.heroPhoto} />
          </picture>
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
