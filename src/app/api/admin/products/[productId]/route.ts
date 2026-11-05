import type { NextRequest } from "next/server";
import { z } from "zod";

import { adminErrorResponse, adminJson, getAdminRequestContext, readAdminBody } from "@/features/admin/api/admin-http";
import { AdminDomainError, deleteAdminProduct, updateAdminProduct } from "@/features/admin/api/admin-service";
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  if (!isSameOrigin(request)) return adminJson({ message: "Недопустимый запрос." }, 403);
  const context = await getAdminRequestContext(request);
  if (!context.ok) return context.response;
  const id = z.uuid().safeParse((await params).productId);
  if (!id.success) return context.finish(adminJson({ message: "Проверьте идентификатор товара." }, 400));
  try {
    return context.finish(adminJson(await deleteAdminProduct(id.data)));
  } catch (error) {
    if (error instanceof AdminDomainError) {
      const messages: Record<AdminDomainError["code"], string> = {
        NOT_FOUND: "Товар не найден.",
        DELETE_REQUIRES_DRAFT: "Удалить можно только черновик товара.",
        PRODUCT_IN_USE: "Товар есть в корзине или заказе. Используйте архивирование.",
        STORAGE_UNAVAILABLE: "Хранилище фотографий недоступно. Повторите позже.",
        PUBLISH_REQUIREMENTS: "Не удалось удалить товар.",
        INVALID_TRANSITION: "Не удалось удалить товар.",
      };
      return context.finish(adminJson({ message: messages[error.code] }, error.code === "NOT_FOUND" ? 404 : 409));
    }
    return context.finish(adminErrorResponse(error));
  }
}
