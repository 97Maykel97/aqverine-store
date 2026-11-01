import { NextResponse, type NextRequest } from "next/server";

import { createRouteAuthClient } from "@/features/auth/api/supabase-server";
import { isAuthConfigured } from "@/features/auth/model/auth-config";
import { UserRole } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";

type AdminRequestContext =
  | { ok: false; response: NextResponse }
  | { ok: true; userId: string; finish: (response: NextResponse) => NextResponse };

export function adminJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function readAdminBody(request: NextRequest): Promise<unknown | null> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return null;
  if (Number(request.headers.get("content-length") ?? 0) > 32768) return null;
  try {
    const raw = await request.text();
    return raw.length <= 32768 ? JSON.parse(raw) as unknown : null;
  } catch {
    return null;
  }
}

export async function getAdminRequestContext(request: NextRequest): Promise<AdminRequestContext> {
  if (!isAuthConfigured()) return { ok: false, response: adminJson({ message: "Сервис временно недоступен." }, 503) };
  const context = createRouteAuthClient(request);
  if (!context) return { ok: false, response: adminJson({ message: "Сервис временно недоступен." }, 503) };
  try {
    const { data, error } = await context.client.auth.getUser();
    if (error || !data.user) return { ok: false, response: context.finish(adminJson({ message: "Требуется вход." }, 401)) };
    const user = await getPrisma().user.findUnique({ where: { id: data.user.id }, select: { id: true, role: true } });
    if (!user || user.role !== UserRole.ADMIN) return { ok: false, response: context.finish(adminJson({ message: "Доступ запрещён." }, 403)) };
    return { ok: true, userId: user.id, finish: context.finish };
  } catch {
    console.error("Admin authorization failed");
    return { ok: false, response: context.finish(adminJson({ message: "Сервис временно недоступен." }, 503)) };
  }
}

export function adminErrorResponse(error: unknown) {
  console.error("Admin operation failed", error instanceof Error ? error.name : "unknown");
  return adminJson({ message: "Не удалось выполнить действие." }, 503);
}
