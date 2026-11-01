import type { NextRequest } from "next/server";
import { z } from "zod";

import { adminErrorResponse, adminJson, getAdminRequestContext, readAdminBody } from "@/features/admin/api/admin-http";
import { AdminDomainError, updateAdminProduct } from "@/features/admin/api/admin-service";
import { adminProductUpdateSchema } from "@/features/admin/model/admin-input";
import { isSameOrigin } from "@/features/auth/api/http";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  if (!isSameOrigin(request)) return adminJson({ message: "Недопустимый запрос." }, 403);
  const context = await getAdminRequestContext(request);
  if (!context.ok) return context.response;
  const id = z.uuid().safeParse((await params).productId);
  const input = adminProductUpdateSchema.safeParse(await readAdminBody(request));
  if (!id.success || !input.success) return context.finish(adminJson({ message: "Проверьте данные товара." }, 400));
  try {
    return context.finish(adminJson(await updateAdminProduct(id.data, input.data)));
  } catch (error) {
    if (error instanceof AdminDomainError) {
      return context.finish(adminJson({ message: error.code === "PUBLISH_REQUIREMENTS"
        ? "Для публикации нужны активный вариант и фотография." : "Товар не найден." }, error.code === "NOT_FOUND" ? 404 : 409));
    }
    return context.finish(adminErrorResponse(error));
  }
}
