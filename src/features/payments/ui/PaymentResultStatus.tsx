"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { z } from "zod";

import styles from "./PaymentResultPreview.module.scss";

const orderStatusSchema = z.object({
  number: z.string(),
  status: z.enum(["PENDING_PAYMENT", "PAID", "PROCESSING", "COMPLETED", "CANCELLED", "REFUNDED"]),
  paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "CANCELLED", "REFUNDED"]).nullable(),
});

type OrderStatus = z.infer<typeof orderStatusSchema>;

async function fetchOrderStatus(orderId: string): Promise<OrderStatus> {
  const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}`, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (response.status === 401) throw new Error("UNAUTHORIZED");
  if (!response.ok) throw new Error("UNAVAILABLE");
  return orderStatusSchema.parse(await response.json() as unknown);
}

export function PaymentResultStatus({ orderId }: { orderId: string }) {
  const query = useQuery({
    queryKey: ["payment-result", orderId],
    queryFn: () => fetchOrderStatus(orderId),
    retry: false,
    refetchInterval: (current) => current.state.data?.status === "PENDING_PAYMENT" ? 4000 : false,
  });
  const status = query.data;
  const paid = status && ["PAID", "PROCESSING", "COMPLETED"].includes(status.status) && status.paymentStatus === "PAID";
  const ended = status && ["CANCELLED", "REFUNDED"].includes(status.status);
  const title = paid ? "ОПЛАТА ПОДТВЕРЖДЕНА."
    : ended ? "ЗАКАЗ НЕ ОПЛАЧЕН."
      : query.error?.message === "UNAUTHORIZED" ? "ВОЙДИ В АККАУНТ."
        : query.isError ? "СТАТУС НЕДОСТУПЕН."
          : "ПРОВЕРЯЕМ ОПЛАТУ.";
  const description = paid
    ? `Заказ ${status.number} оплачен. Подтверждение получено от платёжного провайдера.`
    : ended ? `Заказ ${status.number} не ожидает оплаты. Вернись к покупкам или свяжись с поддержкой.`
      : query.error?.message === "UNAUTHORIZED"
        ? "Статус заказа доступен только в аккаунте, с которого он был оформлен."
        : query.isError
          ? "Не удалось получить статус заказа. Обнови страницу позже или открой историю заказов в аккаунте."
          : "Ожидаем подтверждение от платёжного провайдера. Страница обновит статус автоматически.";

  return (
    <section aria-labelledby="payment-result-title" className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.top}><span>AQVERINE / PAYMENT</span><span>ЗАКАЗ {status?.number ?? ""}</span></div>
        <div className={styles.content}>
          <span aria-hidden="true" className={styles.symbol}>{paid ? "✓" : ended ? "×" : "↗"}</span>
          <span className={styles.eyebrow}>СТАТУС ЗАКАЗА</span>
          <h1 id="payment-result-title">{title}</h1>
          <p role="status">{description}</p>
          <div className={styles.actions}>
            <Link href="/account">К моим заказам <span aria-hidden="true">↗</span></Link>
            <Link href={query.error?.message === "UNAUTHORIZED" ? `/login?next=${encodeURIComponent(`/payment/success?order=${orderId}`)}` : "/catalog"}>
              {query.error?.message === "UNAUTHORIZED" ? "Войти" : "Вернуться в каталог"}
            </Link>
          </div>
        </div>
        <div className={styles.bottom}><span>СТАТУС ИЗ ЗАЩИЩЁННОГО API</span><span>VISA / MASTERCARD / STRIPE</span></div>
      </div>
    </section>
  );
}
