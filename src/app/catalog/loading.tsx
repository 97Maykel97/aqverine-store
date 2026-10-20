import styles from "./page.module.scss";

export default function CatalogLoading() {
  return (
    <section className={`${styles.catalog} ${styles.state}`} aria-busy="true" aria-label="Загрузка каталога">
      <span className={styles.stateLabel}>AQVERINE / КАТАЛОГ</span>
      <h1>СОБИРАЕМ КОЛЛЕКЦИЮ</h1>
      <p>Загружаем вещи…</p>
    </section>
  );
}
