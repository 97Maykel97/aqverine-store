import { NextResponse, type NextRequest } from "next/server";

import { getAccountRequestContext, readAccountBody } from "@/features/account/api/account-http";
import { isSameOrigin } from "@/features/auth/api/http";
import { allowAuthAttempt } from "@/features/auth/model/rate-limit";
import { startCheckout } from "@/features/checkout/api/checkout-service";
import { CheckoutError, checkoutRequestSchema } from "@/features/checkout/model/checkout-input";
import { getPaymentProvider } from "@/features/payments/api/stripe-provider";

function response(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return response("Недопустимый запрос.", 403);
  const parsed = checkoutRequestSchema.safeParse(await readAccountBody(request));
  if (!parsed.success) return response("Проверьте данные оформления.", 400);

  const context = await getAccountRequestContext(request);
  if (!context.ok) return context.response;
  if (!allowAuthAttempt("checkout", context.userId, 10)) {
    return context.finish(response("Слишком много попыток. Повторите позже.", 429));
  }
  const provider = getPaymentProvider();
  if (!provider) return context.finish(response("Оплата пока недоступна.", 503));

  try {
    const result = await startCheckout(context.userId, parsed.data, provider);
    return context.finish(NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } }));
  } catch (error) {
    if (error instanceof CheckoutError) {
      const [message, status] = error.code === "EMPTY_CART" ? ["Корзина пуста.", 409] :
        error.code === "INSUFFICIENT_STOCK" ? ["Некоторых товаров уже нет в нужном количестве.", 409] :
          error.code === "PRODUCT_UNAVAILABLE" ? ["Один из товаров недоступен.", 409] :
            error.code === "INVALID_TOTAL" ? ["Не удалось рассчитать заказ.", 409] :
              ["Не удалось начать оплату. Повторите попытку.", 503];
      return context.finish(response(message, status));
    }
    console.error("Checkout failed");
    return context.finish(response("Не удалось оформить заказ. Повторите попытку.", 503));
  }
}
