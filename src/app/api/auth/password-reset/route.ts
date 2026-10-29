import type { NextRequest } from "next/server";

import { authJson, isSameOrigin, readAuthBody } from "@/features/auth/api/http";
import { createRouteAuthClient } from "@/features/auth/api/supabase-server";
import { isAuthConfigured } from "@/features/auth/model/auth-config";
import { passwordResetSchema } from "@/features/auth/model/demo-auth";
import { allowAuthAttempt } from "@/features/auth/model/rate-limit";

const confirmation = "Если аккаунт с таким email существует, ссылка для восстановления отправлена.";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return authJson({ message: "Недопустимый запрос." }, 403);
  const parsed = passwordResetSchema.safeParse(await readAuthBody(request));
  if (!parsed.success) return authJson({ message: "Укажите корректный email." }, 400);
  if (!allowAuthAttempt("password-reset", parsed.data.email, 3)) {
    return authJson({ message: confirmation });
  }
  if (!isAuthConfigured() || !process.env.NEXT_PUBLIC_APP_URL) {
    return authJson({ message: "Восстановление доступа пока недоступно." }, 503);
  }

  const context = createRouteAuthClient(request);
  if (!context) return authJson({ message: "Восстановление доступа пока недоступно." }, 503);

  try {
    const callback = new URL("/auth/callback", process.env.NEXT_PUBLIC_APP_URL);
    callback.searchParams.set("next", "/account/update-password");
    await context.client.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: callback.toString() });
  } catch {
    console.error("Authentication service failed during password reset");
  }

  return context.finish(authJson({ message: confirmation }));
}
