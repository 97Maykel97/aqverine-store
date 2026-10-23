import Link from "next/link";

import styles from "./PaymentResultPreview.module.scss";

export function PaymentResultPreview({ variant }: { variant: "success" | "failure" }) {
  const isSuccess = variant === "success";

  return (
    <section className={styles.page} aria-labelledby="payment-result-title">
      <div className={styles.panel}>
        <div className={styles.top}><span>AQVERINE / PAYMENT</span><span>ДЕМО-РЕЗУЛЬТАТ</span></div>
        <div className={styles.content}>
          <span className={styles.symbol} aria-hidden="true">{isSuccess ? "↗" : "×"}</span>
          <span className={styles.eyebrow}>СТАТУС ПЛАТЕЖА / ДЕМО</span>
          <h1 id="payment-result-title">{isSuccess ? <>ПЛАТЁЖ<br />НЕ ПРОВЕРЕН.</> : <>ПЛАТЁЖ<br />НЕ СОЗДАН.</>}</h1>
          <p>{isSuccess
            ? "Этот адрес сам по себе не подтверждает оплату. Заказ считается оплаченным только после проверенного webhook платёжного провайдера. Сейчас платёжная интеграция ещё не подключена."
            : "В демо-режиме платёж не создаётся и деньги не списываются. Когда оплата будет подключена, здесь появится подтверждённый сервером результат и дальнейшие действия."}</p>
          <div className={styles.actions}><Link href="/catalog">Вернуться в каталог <span aria-hidden="true">↗</span></Link><Link href="/checkout">К оформлению</Link></div>
        </div>
        <div className={styles.bottom}><span>NO CLIENT-SIDE PAYMENT CONFIRMATION</span><span>VISA / MASTERCARD / FUTURE INTEGRATION</span></div>
      </div>
    </section>
  );
}
