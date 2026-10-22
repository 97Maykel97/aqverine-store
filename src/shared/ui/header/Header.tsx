"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { useCart } from "@/features/cart/ui/CartProvider";
import { searchProducts } from "@/features/catalog/model/catalog-discovery";
import { categories, formatPrice, mockProducts } from "@/features/catalog/model/mock-products";

import styles from "./Header.module.scss";

type Panel = "search" | "menu" | null;

export function Header() {
  const { count, openCart } = useCart();
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [query, setQuery] = useState("");
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const results = searchProducts(mockProducts, query).slice(0, 4);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || panel === null) return;
    if (!dialog.open) dialog.showModal();
    if (panel === "search") searchRef.current?.focus();
    return () => { if (dialog.open) dialog.close(); };
  }, [panel]);

  const closePanel = () => setPanel(null);
  const searchHref = `/catalog?q=${encodeURIComponent(query.trim())}`;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = results[activeSuggestion];
    closePanel();
    router.push(selected && query.trim() ? `/products/${selected.slug}` : query.trim() ? searchHref : "/catalog");
  }

  function handleSearchKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) => Math.min(current + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) => Math.max(current - 1, -1));
    }
  }

  return (
    <header className={styles.header}>
      <Link className={styles.announcement} href="/catalog">Новая коллекция уже здесь <span aria-hidden="true">↗</span></Link>
      <div className={styles.inner}>
        <Link className={styles.logo} href="/" aria-label="AQVERINE — на главную">AQVERINE</Link>
        <nav className={styles.navigation} aria-label="Основная навигация"><Link href="/catalog">Каталог</Link><Link href="/#about">О бренде</Link></nav>
        <div className={styles.actions}>
          <button aria-label="Поиск товаров" className={styles.iconButton} onClick={() => { setActiveSuggestion(-1); setPanel("search"); }} type="button"><SearchIcon /></button>
          <button aria-label={`Открыть корзину, товаров: ${count}`} className={`${styles.iconButton} ${styles.cart}`} onClick={() => { closePanel(); openCart(); }} type="button"><BagIcon /><span>{count}</span></button>
          <button aria-label="Открыть меню" className={styles.iconButton} onClick={() => setPanel("menu")} type="button"><MenuIcon /></button>
        </div>
      </div>
      <dialog aria-label={panel === "search" ? "Поиск товаров" : "Меню сайта"} className={`${styles.panel} ${panel === "menu" ? styles.menuPanel : styles.searchPanel}`} onClick={(event) => { if (event.target === dialogRef.current) closePanel(); }} onClose={closePanel} ref={dialogRef}>
        {panel === "search" ? (
          <div className={styles.searchContent}>
            <div className={styles.panelHeading}><strong>Поиск по коллекции</strong><button aria-label="Закрыть поиск" className={styles.closeButton} onClick={closePanel} type="button"><CloseIcon /></button></div>
            <form className={styles.searchForm} onSubmit={submitSearch} role="search">
              <SearchIcon />
              <input aria-activedescendant={activeSuggestion >= 0 && query.trim() ? `search-suggestion-${activeSuggestion}` : undefined} aria-autocomplete="list" aria-controls="search-suggestions" aria-expanded={Boolean(query.trim())} autoComplete="off" maxLength={80} onChange={(event) => { setQuery(event.target.value); setActiveSuggestion(-1); }} onKeyDown={handleSearchKeys} placeholder="Название вещи или категория" ref={searchRef} role="combobox" type="search" value={query} />
              <button aria-label="Показать все результаты" type="submit">↗</button>
            </form>
            <div className={styles.resultHeading}>{query.trim() ? "Найденные вещи" : "Начни с этих вещей"}</div>
            {results.length > 0 ? (
              <div className={styles.suggestions} id="search-suggestions" role="listbox">
                {results.map((product, index) => (
                  <Link aria-selected={index === activeSuggestion} className={index === activeSuggestion ? styles.activeSuggestion : undefined} href={`/products/${product.slug}`} id={`search-suggestion-${index}`} key={product.id} onClick={closePanel} role="option">
                    <span className={styles.suggestionImage}><Image alt="" fill sizes="60px" src={product.image} /></span>
                    <span className={styles.suggestionText}><strong>{product.name}</strong><small>{formatPrice(product.price)}</small></span>
                    <span aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            ) : <p className={styles.noResults} role="status">Пока ничего не нашли. Попробуй другой запрос.</p>}
            <Link className={styles.allResults} href={query.trim() ? searchHref : "/catalog"} onClick={closePanel}>{query.trim() ? "Все результаты поиска" : "Весь каталог"}<span aria-hidden="true">↗</span></Link>
          </div>
        ) : panel === "menu" ? (
          <div className={styles.menuContent}>
            <div className={styles.panelHeading}><strong>Меню</strong><button aria-label="Закрыть меню" className={styles.closeButton} onClick={closePanel} type="button"><CloseIcon /></button></div>
            <div className={styles.menuBody}>
              <nav aria-label="Категории товаров" className={styles.menuLinks}>
                <Link className={styles.menuLead} href="/catalog" onClick={closePanel}>Вся коллекция <span aria-hidden="true">↗</span></Link>
                {categories.slice(1).map((category) => <Link href={`/catalog?category=${category.value}`} key={category.value} onClick={closePanel}>{category.label}<span aria-hidden="true">↗</span></Link>)}
                <Link className={styles.menuAbout} href="/#about" onClick={closePanel}>О бренде <span aria-hidden="true">↗</span></Link>
              </nav>
              <Link className={styles.menuCampaign} href="/catalog" onClick={closePanel}><Image alt="Коллекция AQVERINE в городском ритме" fill sizes="(max-width: 700px) 100vw, 38vw" src="/images/campaign-cobalt.png" /><span>ОДЕЖДА ДЛЯ ЖИЗНИ<br />В ДВИЖЕНИИ <b aria-hidden="true">↗</b></span></Link>
            </div>
            <span className={styles.menuFootnote}>ТВОЙ ГОРОД. ТВОИ ПРАВИЛА.</span>
          </div>
        ) : null}
      </dialog>
    </header>
  );
}

function SearchIcon() { return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>; }
function BagIcon() { return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M5 8h14l-1.1 12H6.1L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg>; }
function MenuIcon() { return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" /></svg>; }
function CloseIcon() { return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M5 5 19 19M19 5 5 19" /></svg>; }
