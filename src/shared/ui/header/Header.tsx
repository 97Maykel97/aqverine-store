"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { useCart } from "@/features/cart/ui/CartProvider";

import styles from "./Header.module.scss";

export function Header() {
  const { count, openCart } = useCart();
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) mobileSearchRef.current?.focus();
  }, [isSearchOpen]);

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
          <button
            aria-controls={isSearchOpen ? "mobile-search" : undefined}
            aria-expanded={isSearchOpen}
            aria-label={isSearchOpen ? "Закрыть поиск" : "Открыть поиск"}
            className={styles.mobileSearchToggle}
            onClick={() => { setSearchOpen((open) => !open); setMenuOpen(false); }}
            type="button"
          >
            <SearchIcon />
          </button>
          <button aria-label={`Открыть корзину, товаров: ${count}`} className={styles.cart} onClick={() => { setMenuOpen(false); setSearchOpen(false); openCart(); }} type="button">
            <BagIcon />
            <span>{count}</span>
          </button>
          <button
            aria-controls={isMenuOpen ? "mobile-navigation" : undefined}
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"}
            className={styles.menuToggle}
            onClick={() => { setMenuOpen((open) => !open); setSearchOpen(false); }}
            type="button"
          >
            <MenuIcon open={isMenuOpen} />
          </button>
        </div>
      </div>
      {isSearchOpen ? (
        <form action="/catalog" className={styles.mobileSearch} id="mobile-search" onSubmit={() => setSearchOpen(false)} role="search">
          <label className={styles.srOnly} htmlFor="mobile-site-search">Поиск товаров</label>
          <input id="mobile-site-search" name="q" placeholder="Найти вещь" ref={mobileSearchRef} type="search" />
          <button type="submit">Искать <span aria-hidden="true">↗</span></button>
        </form>
      ) : null}
      {isMenuOpen ? (
        <nav aria-label="Мобильная навигация" className={styles.mobileNavigation} id="mobile-navigation">
          <Link href="/catalog" onClick={() => setMenuOpen(false)}>Каталог <span aria-hidden="true">↗</span></Link>
          <Link href="/#about" onClick={() => setMenuOpen(false)}>О бренде <span aria-hidden="true">↗</span></Link>
        </nav>
      ) : null}
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

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      {open ? <path d="M5 5 19 19M19 5 5 19" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
    </svg>
  );
}
