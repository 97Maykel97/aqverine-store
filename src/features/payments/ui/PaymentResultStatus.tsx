"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";

import { RetryPaymentButton } from "@/features/payments/ui/RetryPaymentButton";

import styles from "./PaymentResultPreview.module.scss";

const orderStatusSchema = z.object({
  number: z.number().int().positive(),
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
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1 } } }));
  return <QueryClientProvider client={queryClient}><PaymentResultContent orderId={orderId} /></QueryClientProvider>;
}

function PaymentResultContent({ orderId }: { orderId: string }) {
  const query = useQuery({
    queryKey: ["payment-result", orderId],
    queryFn: () => fetchOrderStatus(orderId),
    retry: false,
    refetchInterval: (current) => current.state.data?.status === "PENDING_PAYMENT" ? 4000 : false,
  });
  const status = query.data;
  const paid = status && ["PAID", "PROCESSING", "COMPLETED"].includes(status.status) && status.paymentStatus === "PAID";
  const cancelled = status?.status === "CANCELLED";
  const refunded = status?.status === "REFUNDED";
  const canRetry = status?.status === "CANCELLED" &&
    (status.paymentStatus === "CANCELLED" || status.paymentStatus === "FAILED");
  const title = paid ? "ОПЛАТА ПОДТВЕРЖДЕНА."
    : refunded ? "ВОЗВРАТ ОФОРМЛЕН."
      : cancelled ? "ЗАКАЗ НЕ ОПЛАЧЕН."
      : query.error?.message === "UNAUTHORIZED" ? "ВОЙДИ В АККАУНТ."
        : query.isError ? "СТАТУС НЕДОСТУПЕН."
          : "ПРОВЕРЯЕМ ОПЛАТУ.";
  const description = paid
    ? `Заказ ${status.number} оплачен. Подтверждение получено от платёжного провайдера.`
    : refunded ? `По заказу ${status.number} оформлен возврат.`
      : cancelled ? `Заказ ${status.number} не ожидает оплаты. Можно повторить оплату, если товары ещё доступны.`
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
          <span aria-hidden="true" className={styles.symbol}>{paid ? "✓" : cancelled ? "×" : "↗"}</span>
          <span className={styles.eyebrow}>СТАТУС ЗАКАЗА</span>
          <h1 id="payment-result-title">{title}</h1>
          <p role="status">{description}</p>
          <div className={styles.actions}>
            {canRetry ? <RetryPaymentButton orderId={orderId} theme="light" /> : null}
            <Link href="/account">К моим заказам <span aria-hidden="true">↗</span></Link>
            <Link href={query.error?.message === "UNAUTHORIZED" ? "/login?next=/account" : "/catalog"}>
              {query.error?.message === "UNAUTHORIZED" ? "Войти" : "Вернуться в каталог"}
            </Link>
          </div>
        </div>
        <div className={styles.bottom}><span>СТАТУС ИЗ ЗАЩИЩЁННОГО API</span><span>VISA / MASTERCARD / STRIPE</span></div>
      </div>
    </section>
  );
}

export function PaymentResultLoading() {
  return (
    <section aria-label="Проверка статуса оплаты" className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.top}><span>AQVERINE / PAYMENT</span></div>
        <div className={styles.content}>
          <span aria-hidden="true" className={styles.symbol}>↗</span>
          <h1>ПРОВЕРЯЕМ ОПЛАТУ.</h1>
          <p role="status">Загружаем статус заказа.</p>
        </div>
      </div>
    </section>
  );
}
