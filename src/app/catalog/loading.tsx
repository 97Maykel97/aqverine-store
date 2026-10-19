import styles from "./page.module.scss";

export default function CatalogLoading() {
  return (
    <section className={styles.catalog} aria-busy="true" aria-label="Загрузка каталога">
      <h1>Каталог</h1>
      <p>Загружаем вещи…</p>
    </section>
  );
}
