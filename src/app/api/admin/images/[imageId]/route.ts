import type { NextRequest } from "next/server";
import { z } from "zod";

import { adminErrorResponse, adminJson, getAdminRequestContext, readAdminBody } from "@/features/admin/api/admin-http";
import { AdminStorageError, deleteProductImage, updateProductImageOrder } from "@/features/admin/api/admin-storage";
import { isSameOrigin } from "@/features/auth/api/http";

const orderSchema = z.object({ sortOrder: z.number().int().min(0).max(10000) }).strict();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ imageId: string }> }) {
  if (!isSameOrigin(request)) return adminJson({ message: "Недопустимый запрос." }, 403);
  const context = await getAdminRequestContext(request);
  if (!context.ok) return context.response;
  const id = z.uuid().safeParse((await params).imageId);
  const input = orderSchema.safeParse(await readAdminBody(request));
  if (!id.success || !input.success) return context.finish(adminJson({ message: "Некорректный порядок фото." }, 400));
  try {
    return context.finish(adminJson(await updateProductImageOrder(id.data, input.data.sortOrder)));
  } catch (error) {
    if (error instanceof AdminStorageError) return context.finish(adminJson({ message: "Фото не найдено." }, 404));
    return context.finish(adminErrorResponse(error));
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ imageId: string }> }) {
  if (!isSameOrigin(request)) return adminJson({ message: "Недопустимый запрос." }, 403);
  const context = await getAdminRequestContext(request);
  if (!context.ok) return context.response;
  const id = z.uuid().safeParse((await params).imageId);
  if (!id.success) return context.finish(adminJson({ message: "Фото не найдено." }, 404));
  try {
    return context.finish(adminJson(await deleteProductImage(id.data)));
  } catch (error) {
    if (error instanceof AdminStorageError) {
      const [message, status] = error.code === "PRODUCT_NOT_FOUND" ? ["Фото не найдено.", 404] :
        error.code === "INVALID_FILE" ? ["Нельзя удалить последнее фото опубликованного товара.", 409] :
          ["Удаление недоступно.", 503];
      return context.finish(adminJson({ message }, status));
    }
    return context.finish(adminErrorResponse(error));
  }
}
