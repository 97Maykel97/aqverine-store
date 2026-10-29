import type { NextRequest } from "next/server";

import { authJson, isSameOrigin, readAuthBody } from "@/features/auth/api/http";
import { createRouteAuthClient } from "@/features/auth/api/supabase-server";
import { isAuthConfigured } from "@/features/auth/model/auth-config";
import { registrationSchema } from "@/features/auth/model/demo-auth";
import { allowAuthAttempt } from "@/features/auth/model/rate-limit";

const confirmation = "Если адрес доступен для регистрации, проверьте почту для подтверждения.";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return authJson({ message: "Недопустимый запрос." }, 403);
  const parsed = registrationSchema.safeParse(await readAuthBody(request));
  if (!parsed.success) return authJson({ message: "Проверьте поля формы." }, 400);
  if (!allowAuthAttempt("register", parsed.data.email, 3)) {
    return authJson({ message: "Слишком много попыток. Попробуйте позже." }, 429);
  }
  if (!isAuthConfigured() || !process.env.NEXT_PUBLIC_APP_URL) {
    return authJson({ message: "Регистрация пока недоступна." }, 503);
  }

  const context = createRouteAuthClient(request);
  if (!context) return authJson({ message: "Регистрация пока недоступна." }, 503);

  try {
    const { data, error } = await context.client.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { name: parsed.data.name },
        emailRedirectTo: new URL("/auth/callback", process.env.NEXT_PUBLIC_APP_URL).toString(),
      },
    });
    if (error) {
      console.error("Authentication service rejected registration");
      return context.finish(authJson({ message: confirmation }));
    }
    if (data.session) {
      const signOut = await context.client.auth.signOut();
      if (signOut.error) throw signOut.error;
    }
    return context.finish(authJson({ message: confirmation }));
  } catch {
    console.error("Authentication service failed during registration");
    return authJson({ message: confirmation });
  }
}
