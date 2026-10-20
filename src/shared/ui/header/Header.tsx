"use client";

import Link from "next/link";

import { useCart } from "@/features/cart/ui/CartProvider";

import styles from "./Header.module.scss";

export function Header() {
  const { count, openCart } = useCart();

  return (
    <header className={styles.header}>
      <Link className={styles.announcement} href="/catalog">
        Новая коллекция уже здесь <span aria-hidden="true">↗</span>
      </Link>
      <div className={styles.inner}>
        <Link className={styles.logo} href="/" aria-label="AQVERINE — на главную">
          AQVERINE
        </Link>
        <nav className={styles.navigation} aria-label="Основная навигация">
          <Link href="/catalog">Каталог</Link>
          <Link href="/#about">О бренде</Link>
        </nav>
        <div className={styles.actions}>
          <form action="/catalog" className={styles.search} role="search">
            <label className={styles.srOnly} htmlFor="site-search">Поиск товаров</label>
            <input id="site-search" name="q" placeholder="Поиск" type="search" />
            <button aria-label="Искать" type="submit">
              <SearchIcon />
            </button>
          </form>
          <button aria-label={`Открыть корзину, товаров: ${count}`} className={styles.cart} onClick={openCart} type="button">
            <BagIcon />
            <span>{count}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="10.8" cy="10.8" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M5 8h14l-1.1 12H6.1L5 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </svg>
  );
}
