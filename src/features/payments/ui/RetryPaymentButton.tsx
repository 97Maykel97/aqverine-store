"use client";

import { useMutation } from "@tanstack/react-query";
import { useRef } from "react";

import { requestPaymentRetry } from "@/features/payments/api/retry-payment-client";

import styles from "./RetryPaymentButton.module.scss";

export function RetryPaymentButton({ orderId, theme = "dark" }: { orderId: string; theme?: "dark" | "light" }) {
  const key = useRef<string | null>(null);
  const retry = useMutation({
    mutationFn: async () => {
      key.current ??= crypto.randomUUID();
      return requestPaymentRetry(orderId, key.current);
    },
    onSuccess: (redirectUrl) => window.location.assign(redirectUrl),
  });

  return <div className={styles.wrap}>
    <button className={`${styles.button} ${theme === "light" ? styles.light : styles.dark}`} disabled={retry.isPending} onClick={() => retry.mutate()} type="button">
      {retry.isPending ? "Открываем оплату…" : "Попробовать оплатить снова"} <span aria-hidden="true">↗</span>
    </button>
    {retry.isError ? <p className={styles.error} role="alert">{retry.error.message}</p> : null}
  </div>;
}
