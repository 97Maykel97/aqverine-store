import Image from "next/image";
import Link from "next/link";

import styles from "./AccountPreview.module.scss";

export function AccountPreview() {
  return (
    <section className={styles.page} aria-labelledby="account-title">
      <div className={styles.header}><span>ACCOUNT / AQVERINE</span><span>ТВОЙ ГОРОД. ТВОИ ПРАВИЛА.</span></div>
      <div className={styles.content}>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>ПРЕДПРОСМОТР</span>
          <h1 id="account-title">ВСЁ ТВОЁ.<br />В ОДНОМ<br /><em>МЕСТЕ.</em></h1>
          <p>Пока сервис входа не настроен, здесь открыт предпросмотр кабинета. Личные данные и заказы недоступны без подтверждённой сессии.</p>
          <div className={styles.actions}><Link href="/login">Войти в аккаунт <span aria-hidden="true">↗</span></Link><Link href="/catalog">Смотреть коллекцию</Link></div>
        </div>
        <div className={styles.visual}>
          <Image alt="Модели AQVERINE в городской одежде" fill priority sizes="(max-width: 760px) 100vw, 42vw" src="/images/campaign-cobalt.png" />
          <span>AQVERINE / ТВОЙ РИТМ</span>
        </div>
      </div>
    </section>
  );
}
