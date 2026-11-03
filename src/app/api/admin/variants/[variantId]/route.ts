import type { NextRequest } from "next/server";
import { z } from "zod";

import { adminErrorResponse, adminJson, getAdminRequestContext, readAdminBody } from "@/features/admin/api/admin-http";
import { AdminDomainError, updateAdminVariant } from "@/features/admin/api/admin-service";
import { adminVariantUpdateSchema } from "@/features/admin/model/admin-input";
import { isSameOrigin } from "@/features/auth/api/http";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ variantId: string }> }) {
  if (!isSameOrigin(request)) return adminJson({ message: "Недопустимый запрос." }, 403);
  const context = await getAdminRequestContext(request);
  if (!context.ok) return context.response;
  const id = z.uuid().safeParse((await params).variantId);
  const input = adminVariantUpdateSchema.safeParse(await readAdminBody(request));
  if (!id.success || !input.success) return context.finish(adminJson({ message: "Проверьте данные варианта." }, 400));
  try {
    return context.finish(adminJson(await updateAdminVariant(id.data, input.data)));
  } catch (error) {
    if (error instanceof AdminDomainError) {
      return context.finish(adminJson({ message: error.code === "PUBLISH_REQUIREMENTS"
        ? "У опубликованного товара должен остаться активный вариант." : "Вариант не найден." },
      error.code === "NOT_FOUND" ? 404 : 409));
    }
    return context.finish(adminErrorResponse(error));
  }
}
