import Image from "next/image";
import Link from "next/link";

import styles from "./AccountPreview.module.scss";

export function AccountPreview() {
  return (
    <section className={styles.page} aria-labelledby="account-title">
      <div className={styles.header}><span>ACCOUNT / AQVERINE</span><span>ТВОЙ ГОРОД. ТВОИ ПРАВИЛА.</span></div>
      <div className={styles.content}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>ДЕМО-КАБИНЕТ</span>
          <h1 id="account-title">ВСЁ ТВОЁ.<br />В ОДНОМ<br /><em>МЕСТЕ.</em></h1>
          <p>Это открытый предпросмотр кабинета — сюда можно зайти без логина и пароля. Личные данные и заказы появятся только после подключения безопасного входа.</p>
          <div className={styles.actions}><Link href="/login">Посмотреть демо-форму входа <span aria-hidden="true">↗</span></Link><Link href="/catalog">Смотреть коллекцию</Link></div>
        </div>
        <div className={styles.visual}>
          <Image alt="Модели AQVERINE в городской одежде" fill priority sizes="(max-width: 760px) 100vw, 42vw" src="/images/campaign-cobalt.png" />
          <span>AQVERINE / ТВОЙ РИТМ</span>
        </div>
      </div>
    </section>
  );
}
