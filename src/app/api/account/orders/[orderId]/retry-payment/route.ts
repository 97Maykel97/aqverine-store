import type { NextRequest } from "next/server";
import { z } from "zod";

import { accountJson, getAccountRequestContext, readAccountBody } from "@/features/account/api/account-http";
import { isSameOrigin } from "@/features/auth/api/http";
import { allowAuthAttempt } from "@/features/auth/model/rate-limit";
import { retryOrderPayment } from "@/features/checkout/api/checkout-service";
import { CheckoutError } from "@/features/checkout/model/checkout-input";
import { getPaymentProvider } from "@/features/payments/api/stripe-provider";

const retrySchema = z.object({ idempotencyKey: z.uuid() }).strict();

export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  if (!isSameOrigin(request)) return accountJson({ message: "Недопустимый запрос." }, 403);
  const orderId = z.uuid().safeParse((await params).orderId);
  const body = retrySchema.safeParse(await readAccountBody(request));
  if (!orderId.success || !body.success) return accountJson({ message: "Проверьте данные запроса." }, 400);

  const context = await getAccountRequestContext(request);
  if (!context.ok) return context.response;
  if (!allowAuthAttempt("payment-retry", context.userId, 10)) {
    return context.finish(accountJson({ message: "Слишком много попыток. Попробуйте позже." }, 429));
  }
  const provider = getPaymentProvider();
  if (!provider) return context.finish(accountJson({ message: "Оплата пока недоступна." }, 503));

  try {
    return context.finish(accountJson(await retryOrderPayment(context.userId, orderId.data, body.data.idempotencyKey, provider)));
  } catch (error) {
    if (error instanceof CheckoutError) {
      const message = error.code === "INSUFFICIENT_STOCK" ? "Недостаточно товара в наличии." :
        error.code === "PRICE_CHANGED" ? "Цена изменилась. Вернитесь в корзину и оформите новый заказ." :
          error.code === "PRODUCT_UNAVAILABLE" ? "Товар больше недоступен. Оформите новый заказ." :
            error.code === "ORDER_UNAVAILABLE" ? "Этот заказ нельзя оплатить повторно." :
              error.code === "RETRY_CONFLICT" ? "Повторите попытку с новым запросом." :
                "Не удалось начать оплату. Попробуйте позже.";
      const status = error.code === "PAYMENT_UNAVAILABLE" ? 503 : 409;
      return context.finish(accountJson({ message }, status));
    }
    console.error("Order payment retry failed");
    return context.finish(accountJson({ message: "Не удалось начать оплату. Попробуйте позже." }, 503));
  }
}
