import type { Metadata } from "next";
import Link from "next/link";

import styles from "./page.module.scss";

export const metadata: Metadata = { title: "Панель управления", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <section className={styles.page} aria-labelledby="admin-title">
      <div className={styles.frame}>
        <div className={styles.top}><strong>AQVERINE / CONTROL</strong><span>PRIVATE AREA / 01</span></div>
        <div className={styles.content}>
          <span className={styles.eyebrow}>ДОСТУП ДЛЯ КОМАНДЫ</span>
          <h1 id="admin-title">ЗАКРЫТО.<br /><em>ПО ДЕЛУ.</em></h1>
          <p>Панель управления товарами и заказами откроется только после подключения серверной авторизации и проверки роли admin. По адресу страницы доступ не предоставляется.</p>
          <div className={styles.notice}><span aria-hidden="true">●</span><div><strong>Доступ пока не настроен</strong><span>Формы входа и административные действия недоступны. Демо-данные не дают прав администратора.</span></div></div>
          <Link href="/">Вернуться в магазин <span aria-hidden="true">↗</span></Link>
        </div>
        <div className={styles.bottom}><span>NO PUBLIC ACCESS</span><span>AUTH REQUIRED / ROLE: ADMIN</span></div>
      </div>
    </section>
  );
}
