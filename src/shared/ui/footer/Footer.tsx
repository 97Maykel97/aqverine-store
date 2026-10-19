import Link from "next/link";

import styles from "./Footer.module.scss";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <Link className={styles.logo} href="/">
          AQVERINE
        </Link>
        <p>Одежда для города, который не стоит на месте.</p>
        <nav aria-label="Навигация в подвале">
          <Link href="/catalog">Каталог</Link>
          <Link href="/account">Аккаунт</Link>
        </nav>
      </div>
    </footer>
  );
}
