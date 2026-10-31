import type { NextRequest } from "next/server";

import { getCartRequestContext, cartErrorResponse, cartJson } from "@/features/cart/api/cart-http";
import { getCartSnapshot } from "@/features/cart/api/cart-service";

export async function GET(request: NextRequest) {
  const context = await getCartRequestContext(request);
  if (!context.ok) return context.response;

  try {
    return context.finish(cartJson(await getCartSnapshot(context.userId)));
  } catch (error) {
    return context.finish(cartErrorResponse(error));
  }
}
