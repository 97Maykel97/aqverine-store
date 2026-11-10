import type { AccountOrders } from "@/features/account/model/account-contracts";

import styles from "./OrderStatusTracker.module.scss";

type OrderSummary = AccountOrders["items"][number];
type ActiveStatus = Exclude<OrderSummary["status"], "CANCELLED" | "REFUNDED">;

const steps: { status: ActiveStatus; label: string }[] = [
  { status: "PENDING_PAYMENT", label: "Ожидает оплаты" },
  { status: "PAID", label: "Оплачен" },
  { status: "PROCESSING", label: "Готовим заказ" },
  { status: "COMPLETED", label: "Завершён" },
];

export function OrderStatusTracker({ order }: { order: OrderSummary }) {
  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    const refunded = order.status === "REFUNDED";

    return (
      <div className={`${styles.exception} ${refunded ? styles.refunded : styles.cancelled}`} role="status">
        <span className={styles.exceptionIcon} aria-hidden="true">{refunded ? "↶" : "×"}</span>
        <div>
          <strong>{refunded ? "По заказу оформлен возврат" : order.paymentStatus === "FAILED" ? "Оплата не прошла" : "Заказ отменён"}</strong>
          <p>{refunded ? "Статус возврата можно уточнить у поддержки." : "Если товары ещё доступны, оплату можно попробовать снова."}</p>
        </div>
      </div>
    );
  }

  const currentIndex = steps.findIndex(({ status }) => status === order.status);

  return (
    <ol aria-label={`Статус заказа №${order.number}`} className={styles.steps}>
      {steps.map(({ status, label }, index) => (
        <li
          aria-current={currentIndex === index ? "step" : undefined}
          className={`${styles.step} ${index < currentIndex ? styles.done : ""} ${index === currentIndex ? styles.current : ""}`}
          key={status}
        >
          <span className={styles.marker} aria-hidden="true">{index < currentIndex ? "✓" : String(index + 1).padStart(2, "0")}</span>
          <span className={styles.label}>{label}</span>
        </li>
      ))}
    </ol>
  );
}
