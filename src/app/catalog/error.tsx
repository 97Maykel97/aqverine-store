"use client";

export default function CatalogError({ reset }: { reset: () => void }) {
  return (
    <section>
      <h1>Не удалось загрузить каталог</h1>
      <p>Пожалуйста, попробуйте ещё раз.</p>
      <button type="button" onClick={reset}>
        Повторить
      </button>
    </section>
  );
}
