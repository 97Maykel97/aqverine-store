import Link from "next/link";

import { LogoutButton } from "@/features/auth/ui/LogoutButton";

import styles from "./AccountDashboard.module.scss";

export function AccountDashboard({ email, name }: { email: string; name?: string | null }) {
  return (
    <section className={styles.page} aria-labelledby="account-title">
      <div className={styles.topline}><span>ACCOUNT / AQVERINE</span><span>ТВОЙ ГОРОД. ТВОИ ПРАВИЛА.</span></div>
      <div className={styles.content}>
        <div className={styles.intro}>
          <span className={styles.eyebrow}>ЛИЧНОЕ ПРОСТРАНСТВО</span>
          <h1 id="account-title">ТВОЙ<br /><em>АККАУНТ.</em></h1>
          <p>{name ? `Рады видеть тебя, ${name}.` : "Рады видеть тебя снова."}</p>
        </div>
        <div className={styles.details}>
          <span>ТВОИ ДАННЫЕ</span>
          <strong>{email}</strong>
          <p>Здесь появятся заказы после подключения оформления и оплаты.</p>
          <div className={styles.actions}>
            <Link href="/catalog">Смотреть коллекцию <span aria-hidden="true">↗</span></Link>
            <Link href="/account/update-password">Изменить пароль</Link>
            <LogoutButton />
          </div>
        </div>
      </div>
    </section>
  );
}
