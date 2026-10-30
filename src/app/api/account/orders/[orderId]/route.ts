import type { NextRequest } from "next/server";
import { z } from "zod";

import { accountErrorResponse, accountJson, getAccountRequestContext } from "@/features/account/api/account-http";
import { getAccountOrder } from "@/features/account/api/account-service";

export async function GET(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  const parsed = z.uuid().safeParse((await params).orderId);
  if (!parsed.success) return accountJson({ message: "Заказ не найден." }, 404);
  const context = await getAccountRequestContext(request);
  if (!context.ok) return context.response;
  try {
    const order = await getAccountOrder(context.userId, parsed.data);
    return context.finish(order ? accountJson(order) : accountJson({ message: "Заказ не найден." }, 404));
  } catch {
    return context.finish(accountErrorResponse());
  }
}
