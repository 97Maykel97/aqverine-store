import { NextResponse, type NextRequest } from "next/server";

import { createRouteAuthClient } from "@/features/auth/api/supabase-server";
import { isAuthConfigured } from "@/features/auth/model/auth-config";
import { getPrisma } from "@/shared/lib/prisma";

type AccountRequestContext =
  | { ok: false; response: NextResponse }
  | { ok: true; userId: string; email: string; finish: (response: NextResponse) => NextResponse };

export function accountJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function readAccountBody(request: NextRequest): Promise<unknown | null> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return null;
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return null;
  try {
    const raw = await request.text();
    return raw.length <= 2048 ? JSON.parse(raw) as unknown : null;
  } catch {
    return null;
  }
}

export async function getAccountRequestContext(request: NextRequest): Promise<AccountRequestContext> {
  if (!isAuthConfigured()) return { ok: false, response: accountJson({ message: "Сервис временно недоступен." }, 503) };
  const context = createRouteAuthClient(request);
  if (!context) return { ok: false, response: accountJson({ message: "Сервис временно недоступен." }, 503) };

  try {
    const { data, error } = await context.client.auth.getUser();
    if (error || !data.user) {
      return { ok: false, response: context.finish(accountJson({ message: "Войдите в аккаунт." }, 401)) };
    }
    const user = await getPrisma().user.findUnique({ where: { id: data.user.id }, select: { id: true } });
    if (!user) return { ok: false, response: context.finish(accountJson({ message: "Войдите в аккаунт." }, 401)) };
    return { ok: true, userId: user.id, email: data.user.email ?? "", finish: context.finish };
  } catch {
    console.error("Account authorization failed");
    return { ok: false, response: context.finish(accountJson({ message: "Сервис временно недоступен." }, 503)) };
  }
}

export function accountErrorResponse() {
  console.error("Account operation failed");
  return accountJson({ message: "Не удалось загрузить данные аккаунта." }, 503);
}
