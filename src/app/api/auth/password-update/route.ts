import { z } from "zod";
import type { NextRequest } from "next/server";

import { authJson, isSameOrigin, readAuthBody } from "@/features/auth/api/http";
import { createRouteAuthClient } from "@/features/auth/api/supabase-server";
import { allowAuthAttempt } from "@/features/auth/model/rate-limit";

const schema = z.object({ password: z.string().min(8).max(128) });

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return authJson({ message: "Недопустимый запрос." }, 403);
  const parsed = schema.safeParse(await readAuthBody(request));
  if (!parsed.success) return authJson({ message: "Пароль должен содержать от 8 до 128 символов." }, 400);
  const context = createRouteAuthClient(request);
  if (!context) return authJson({ message: "Смена пароля пока недоступна." }, 503);

  try {
    const { data, error } = await context.client.auth.getUser();
    if (error || !data.user) return context.finish(authJson({ message: "Сначала войдите в аккаунт." }, 401));
    if (!allowAuthAttempt("password-update", data.user.id, 3)) {
      return context.finish(authJson({ message: "Слишком много попыток. Попробуйте позже." }, 429));
    }
    const result = await context.client.auth.updateUser({ password: parsed.data.password });
    if (result.error) throw result.error;
    return context.finish(authJson({ ok: true }));
  } catch {
    console.error("Authentication service failed during password update");
    return context.finish(authJson({ message: "Не удалось сменить пароль. Попробуйте позже." }, 503));
  }
}
