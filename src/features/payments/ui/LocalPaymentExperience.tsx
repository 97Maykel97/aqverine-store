"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";

import { formatPrice } from "@/features/catalog/model/mock-products";

import styles from "./LocalPaymentExperience.module.scss";

type Outcome = "paid" | "failed" | "cancelled";

const resultSchema = z.object({ redirectUrl: z.url() });
const errorSchema = z.object({ message: z.string() });

export function LocalPaymentExperience({ session, orderNumber, amountMinor }: {
  session: string;
  orderNumber: number;
  amountMinor: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Outcome | null>(null);
  const [error, setError] = useState("");

  async function complete(outcome: Outcome) {
    setPending(outcome);
    setError("");
    try {
      const response = await fetch("/api/payments/demo/complete", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, outcome }),
      });
      const raw: unknown = await response.json();
      if (!response.ok) {
        const parsed = errorSchema.safeParse(raw);
        setError(parsed.success ? parsed.data.message : "Не удалось проверить оплату. Повторите попытку.");
        return;
      }
      const destination = new URL(resultSchema.parse(raw).redirectUrl);
      router.push(`${destination.pathname}${destination.search}`);
    } catch {
      setError("Не удалось связаться с сервером. Повторите попытку.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="local-payment-title" className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.top}><strong>AQVERINE / CHECKOUT</strong><span>ЛОКАЛЬНАЯ ПРОВЕРКА</span></div>
        <div className={styles.content}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}>ЗАКАЗ № {orderNumber}</span>
            <h1 id="local-payment-title">ОПЛАТА<br /><em>БЕЗ РИСКА.</em></h1>
            <p>Это симулятор для проверки заказа. Выбери результат — приложение обработает подписанное событие оплаты. Карту вводить не нужно, деньги не списываются.</p>
            <Link href="/account">Вернуться к заказам ↗</Link>
          </div>
          <div className={styles.card}>
            <span>К ОПЛАТЕ / USD</span>
            <strong>{formatPrice(amountMinor)}</strong>
            <div className={styles.separator} />
            <p>Выбери сценарий проверки:</p>
            <button disabled={pending !== null} onClick={() => void complete("paid")} type="button">
              {pending === "paid" ? "Подтверждаем…" : "Оплата прошла"}<span aria-hidden="true">↗</span>
            </button>
            <button className={styles.secondary} disabled={pending !== null} onClick={() => void complete("failed")} type="button">
              {pending === "failed" ? "Проверяем…" : "Платёж отклонён"}
            </button>
            <button className={styles.textButton} disabled={pending !== null} onClick={() => void complete("cancelled")} type="button">
              {pending === "cancelled" ? "Отменяем…" : "Отменить оплату"}
            </button>
            {error ? <p className={styles.error} role="alert">{error}</p> : null}
          </div>
        </div>
        <div className={styles.bottom}><span>ТЕСТОВЫЙ СЦЕНАРИЙ • БЕЗ ДАННЫХ КАРТЫ</span><span>СТАТУС МЕНЯЕТ ТОЛЬКО ПОДПИСАННЫЙ WEBHOOK</span></div>
      </div>
    </section>
  );
}
