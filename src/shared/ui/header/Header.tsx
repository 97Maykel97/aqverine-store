import Link from "next/link";

import styles from "./Header.module.scss";

const BagIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M5 8.5h14l-1 12H6l-1-12Z" />
    <path d="M9 9V6a3 3 0 0 1 6 0v3" />
  </svg>
);

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.logo} href="/" aria-label="AQVERINE — на главную">
          AQVERINE
        </Link>
        <nav className={styles.navigation} aria-label="Основная навигация">
          <Link href="/catalog">Каталог</Link>
          <Link href="/account">Войти</Link>
          <Link className={styles.bag} href="/checkout">
            <BagIcon />
            <span>Корзина (0)</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
