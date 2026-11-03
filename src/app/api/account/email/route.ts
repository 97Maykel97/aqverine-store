import type { NextRequest } from "next/server";

import { accountEmailChangeSchema } from "@/features/account/model/account-input";
import { accountJson, getAccountRequestContext, readAccountBody } from "@/features/account/api/account-http";
import { isSameOrigin } from "@/features/auth/api/http";
import { allowAuthAttempt } from "@/features/auth/model/rate-limit";

const confirmation = "Если новый адрес доступен, проверьте почту для подтверждения изменения.";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return accountJson({ message: "Недопустимый запрос." }, 403);
  const parsed = accountEmailChangeSchema.safeParse(await readAccountBody(request));
  if (!parsed.success) return accountJson({ message: "Укажите корректный адрес почты." }, 400);

  const context = await getAccountRequestContext(request);
  if (!context.ok) return context.response;
  if (!allowAuthAttempt("email-change", context.userId, 3)) {
    return context.finish(accountJson({ message: "Слишком много попыток. Попробуйте позже." }, 429));
  }
  if (parsed.data.email.toLowerCase() === context.email.toLowerCase()) {
    return context.finish(accountJson({ message: confirmation }));
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return context.finish(accountJson({ message: "Смена адреса пока недоступна." }, 503));

  try {
    const callback = new URL("/auth/callback", appUrl);
    const { error } = await context.authClient.auth.updateUser(
      { email: parsed.data.email },
      { emailRedirectTo: callback.toString() },
    );
    if (error) console.error("Authentication service rejected email change");
    return context.finish(accountJson({ message: confirmation }));
  } catch {
    console.error("Authentication service failed during email change");
    return context.finish(accountJson({ message: "Не удалось изменить адрес. Попробуйте позже." }, 503));
  }
}
