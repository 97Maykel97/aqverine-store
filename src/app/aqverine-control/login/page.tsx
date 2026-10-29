import type { Metadata } from "next";
import Link from "next/link";

import styles from "./page.module.scss";

export const metadata: Metadata = { title: "Панель управления", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <section className={styles.page} aria-labelledby="admin-title">
      <div className={styles.frame}>
        <div className={styles.top}><strong>AQVERINE / CONTROL</strong><span>PRIVATE AREA</span></div>
        <div className={styles.content}>
          <span className={styles.eyebrow}>ДОСТУП ДЛЯ КОМАНДЫ</span>
          <h1 id="admin-title">ЗАКРЫТО.<br /><em>ПО ДЕЛУ.</em></h1>
          <p>Вход доступен только подтверждённой учётной записи с ролью администратора. Права проверяются на сервере при каждом открытии панели.</p>
          <div className={styles.notice}><span aria-hidden="true">●</span><div><strong>Защищённый доступ</strong><span>Логин и пароль покупателя не открывают административные действия.</span></div></div>
          <Link href="/login?next=/aqverine-control">Войти как администратор <span aria-hidden="true">↗</span></Link>
        </div>
        <div className={styles.bottom}><span>NO PUBLIC ACCESS</span><span>AUTH REQUIRED / ROLE: ADMIN</span></div>
      </div>
    </section>
  );
}
