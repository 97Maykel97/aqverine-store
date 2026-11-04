import { z } from "zod";

const retryResponseSchema = z.object({ orderId: z.uuid(), redirectUrl: z.url() });
const errorResponseSchema = z.object({ message: z.string().max(300) });

export async function requestPaymentRetry(orderId: string, idempotencyKey: string): Promise<string> {
  const response = await fetch(`/api/account/orders/${encodeURIComponent(orderId)}/retry-payment`, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idempotencyKey }),
  });
  const body: unknown = await response.json().catch(() => null);
  if (response.status === 401) throw new Error("Войдите в аккаунт, чтобы повторить оплату.");
  if (!response.ok) {
    const error = errorResponseSchema.safeParse(body);
    throw new Error(error.success ? error.data.message : "Не удалось повторить оплату. Попробуйте позже.");
  }
  const parsed = retryResponseSchema.safeParse(body);
  if (!parsed.success || parsed.data.orderId !== orderId) throw new Error("Не удалось открыть страницу оплаты.");
  return parsed.data.redirectUrl;
}
