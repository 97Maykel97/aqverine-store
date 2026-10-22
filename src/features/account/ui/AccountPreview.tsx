import Image from "next/image";
import Link from "next/link";

import styles from "./AccountPreview.module.scss";

export function AccountPreview() {
  return (
    <section className={styles.page} aria-labelledby="account-title">
      <div className={styles.header}><span>ACCOUNT / AQVERINE</span><span>ТВОЙ ГОРОД. ТВОИ ПРАВИЛА.</span></div>
      <div className={styles.content}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>ЛИЧНОЕ ПРОСТРАНСТВО / 01</span>
          <h1 id="account-title">ВСЁ ТВОЁ.<br />В ОДНОМ<br /><em>МЕСТЕ.</em></h1>
          <p>Здесь появятся твой профиль, история заказов и вещи, которые ты выбрал. Пока серверная авторизация не подключена, личные данные и заказы не показываются.</p>
          <div className={styles.actions}><Link href="/login">Перейти ко входу <span aria-hidden="true">↗</span></Link><Link href="/catalog">Смотреть коллекцию</Link></div>
          <div className={styles.modules} aria-label="Будущие разделы кабинета">
            <div><span>01</span><strong>Профиль</strong><small>Контакты и настройки</small></div>
            <div><span>02</span><strong>Заказы</strong><small>История и статусы</small></div>
          </div>
        </div>
        <div className={styles.visual}>
          <Image alt="Модели AQVERINE в городской одежде" fill priority sizes="(max-width: 760px) 100vw, 42vw" src="/images/campaign-cobalt.png" />
          <span>AQVERINE / ТВОЙ РИТМ</span>
        </div>
      </div>
    </section>
  );
}
