"use client";

import styles from "./page.module.scss";

export default function CatalogError({ reset }: { reset: () => void }) {
  return (
    <section className={`${styles.catalog} ${styles.state}`}>
      <span className={styles.stateLabel}>AQVERINE / ОШИБКА</span>
      <h1>НЕ УДАЛОСЬ ЗАГРУЗИТЬ КАТАЛОГ</h1>
      <p>Пожалуйста, попробуйте ещё раз.</p>
      <button type="button" onClick={reset}>
        Повторить
      </button>
    </section>
  );
}
