import type { NextRequest } from "next/server";

import { accountErrorResponse, accountJson, getAccountRequestContext } from "@/features/account/api/account-http";
import { listAccountOrders } from "@/features/account/api/account-service";
import { parseOrderListQuery } from "@/features/account/model/account-input";

export async function GET(request: NextRequest) {
  const query = parseOrderListQuery(request.nextUrl.searchParams);
  if (!query) return accountJson({ message: "Проверьте параметры списка заказов." }, 400);
  const context = await getAccountRequestContext(request);
  if (!context.ok) return context.response;
  try {
    return context.finish(accountJson(await listAccountOrders(context.userId, query.page, query.limit)));
  } catch {
    return context.finish(accountErrorResponse());
  }
}
