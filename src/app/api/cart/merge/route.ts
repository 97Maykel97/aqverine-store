import type { NextRequest } from "next/server";

import { isSameOrigin } from "@/features/auth/api/http";
import { cartErrorResponse, cartJson, getCartRequestContext, readCartBody } from "@/features/cart/api/cart-http";
import { mergeGuestCart } from "@/features/cart/api/cart-service";
import { mergeCartSchema } from "@/features/cart/model/server-cart";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return cartJson({ message: "Недопустимый запрос." }, 403);
  const parsed = mergeCartSchema.safeParse(await readCartBody(request));
  if (!parsed.success) return cartJson({ message: "Некорректные данные корзины." }, 400);
  const context = await getCartRequestContext(request);
  if (!context.ok) return context.response;

  try {
    return context.finish(cartJson(await mergeGuestCart(context.userId, parsed.data)));
  } catch (error) {
    return context.finish(cartErrorResponse(error));
  }
}
