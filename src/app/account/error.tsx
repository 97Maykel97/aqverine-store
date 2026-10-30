"use client";

import Link from "next/link";

import styles from "@/features/account/ui/AccountError.module.scss";

export default function AccountError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className={styles.page} aria-labelledby="account-error-title">
      <h1 id="account-error-title">КАБИНЕТ<br /><em>НЕДОСТУПЕН.</em></h1>
      <p>Не удалось загрузить данные. Попробуйте ещё раз.</p>
      <div className={styles.actions}>
        <button onClick={reset} type="button">Повторить загрузку</button>
        <Link href="/">На главную</Link>
      </div>
    </section>
  );
}
