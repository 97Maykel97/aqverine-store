import { NextResponse, type NextRequest } from "next/server";

import { createRouteAuthClient } from "@/features/auth/api/supabase-server";
import { isAuthConfigured } from "@/features/auth/model/auth-config";
import { CartDomainError } from "@/features/cart/model/server-cart";
import { getPrisma } from "@/shared/lib/prisma";

type CartRequestContext =
  | { ok: false; response: NextResponse }
  | { ok: true; userId: string; finish: (response: NextResponse) => NextResponse };

export function cartJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function readCartBody(request: NextRequest): Promise<unknown | null> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return null;
  if (Number(request.headers.get("content-length") ?? 0) > 16384) return null;
  try {
    const raw = await request.text();
    return raw.length <= 16384 ? JSON.parse(raw) as unknown : null;
  } catch {
    return null;
  }
}

export async function getCartRequestContext(request: NextRequest): Promise<CartRequestContext> {
  if (!isAuthConfigured()) return { ok: false, response: cartJson({ message: "Корзина временно недоступна." }, 503) };
  const context = createRouteAuthClient(request);
  if (!context) return { ok: false, response: cartJson({ message: "Корзина временно недоступна." }, 503) };

  try {
    const { data, error } = await context.client.auth.getUser();
    if (error || !data.user) return { ok: false, response: context.finish(cartJson({ message: "Войдите в аккаунт." }, 401)) };
    const user = await getPrisma().user.findUnique({ where: { id: data.user.id }, select: { id: true } });
    if (!user) return { ok: false, response: context.finish(cartJson({ message: "Войдите в аккаунт." }, 401)) };
    return { ok: true, userId: user.id, finish: context.finish };
  } catch {
    console.error("Cart authorization failed");
    return { ok: false, response: context.finish(cartJson({ message: "Корзина временно недоступна." }, 503)) };
  }
}

export function cartErrorResponse(error: unknown) {
  if (error instanceof CartDomainError) {
    if (error.code === "INSUFFICIENT_STOCK") {
      return cartJson({ message: "Недостаточно товара в наличии.", availableStock: error.availableStock }, 409);
    }
    return cartJson({ message: "Товар недоступен." }, 404);
  }
  console.error("Cart operation failed");
  return cartJson({ message: "Не удалось обновить корзину." }, 503);
}
