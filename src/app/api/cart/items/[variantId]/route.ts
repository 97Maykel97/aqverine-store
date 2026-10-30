import type { NextRequest } from "next/server";
import { z } from "zod";

import { isSameOrigin } from "@/features/auth/api/http";
import { cartErrorResponse, cartJson, getCartRequestContext } from "@/features/cart/api/cart-http";
import { setCartItem } from "@/features/cart/api/cart-service";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ variantId: string }> }) {
  if (!isSameOrigin(request)) return cartJson({ message: "Недопустимый запрос." }, 403);
  const parsed = z.uuid().safeParse((await params).variantId);
  if (!parsed.success) return cartJson({ message: "Некорректный вариант товара." }, 400);
  const context = await getCartRequestContext(request);
  if (!context.ok) return context.response;

  try {
    return context.finish(cartJson(await setCartItem(context.userId, { variantId: parsed.data, quantity: 0 })));
  } catch (error) {
    return context.finish(cartErrorResponse(error));
  }
}
