import type { NextRequest } from "next/server";

import { authJson, isSameOrigin, readAuthBody } from "@/features/auth/api/http";
import { createRouteAuthClient } from "@/features/auth/api/supabase-server";
import { syncAuthUser } from "@/features/auth/api/sync-user";
import { isAuthConfigured } from "@/features/auth/model/auth-config";
import { loginSchema } from "@/features/auth/model/demo-auth";
import { allowAuthAttempt } from "@/features/auth/model/rate-limit";
import { getPrisma } from "@/shared/lib/prisma";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return authJson({ message: "Недопустимый запрос." }, 403);
  const parsed = loginSchema.safeParse(await readAuthBody(request));
  if (!parsed.success) return authJson({ message: "Проверьте email и пароль." }, 400);
  if (!allowAuthAttempt("login", parsed.data.email)) {
    return authJson({ message: "Слишком много попыток. Попробуйте позже." }, 429);
  }
  if (!isAuthConfigured()) return authJson({ message: "Вход пока недоступен." }, 503);

  const context = createRouteAuthClient(request);
  if (!context) return authJson({ message: "Вход пока недоступен." }, 503);

  try {
    const { data, error } = await context.client.auth.signInWithPassword(parsed.data);
    if (error || !data.user) {
      return context.finish(authJson({ message: "Неверный email или пароль." }, 401));
    }

    await syncAuthUser(data.user);
    const localUser = await getPrisma().user.findUniqueOrThrow({
      where: { id: data.user.id }, select: { role: true },
    });
    return context.finish(authJson({ role: localUser.role }));
  } catch {
    await context.client.auth.signOut().catch(() => undefined);
    console.error("Authentication service failed during sign-in");
    return authJson({ message: "Не удалось выполнить вход. Попробуйте позже." }, 503);
  }
}
