import Link from "next/link";

import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div>
          <Link className={styles.logo} href="/">AQVERINE</Link>
          <p>Твой город. Твой ритм. Твоя одежда.</p>
        </div>
        <nav aria-label="Навигация в подвале">
          <Link href="/catalog">Каталог</Link>
          <Link href="/#about">О бренде</Link>
          <Link href="/login">Аккаунт</Link>
        </nav>
        <span className={styles.copyright}>© AQVERINE</span>
      </div>
    </footer>
  );
}
