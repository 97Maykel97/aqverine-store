import type { NextRequest } from "next/server";

import { authJson, isSameOrigin } from "@/features/auth/api/http";
import { createRouteAuthClient } from "@/features/auth/api/supabase-server";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return authJson({ message: "Недопустимый запрос." }, 403);
  const context = createRouteAuthClient(request);
  if (!context) return authJson({ message: "Выход пока недоступен." }, 503);

  try {
    await context.client.auth.signOut();
    return context.finish(authJson({ ok: true }));
  } catch {
    console.error("Authentication service failed during sign-out");
    return context.finish(authJson({ message: "Не удалось выйти. Попробуйте позже." }, 503));
  }
}
