import type { NextRequest } from "next/server";
import { z } from "zod";

import { adminErrorResponse, adminJson, getAdminRequestContext } from "@/features/admin/api/admin-http";
import { AdminStorageError, uploadProductImage } from "@/features/admin/api/admin-storage";
import { isSameOrigin } from "@/features/auth/api/http";
import { allowAuthAttempt } from "@/features/auth/model/rate-limit";

const metadataSchema = z.object({
  color: z.string().trim().min(1).max(80).nullable(),
  altText: z.string().trim().min(3).max(200),
  sortOrder: z.coerce.number().int().min(0).max(10000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  if (!isSameOrigin(request)) return adminJson({ message: "Недопустимый запрос." }, 403);
  const context = await getAdminRequestContext(request);
  if (!context.ok) return context.response;
  if (!allowAuthAttempt("admin-image-upload", context.userId, 50)) {
    return context.finish(adminJson({ message: "Слишком много загрузок. Повторите позже." }, 429));
  }
  const productId = z.uuid().safeParse((await params).productId);
  const contentLength = Number(request.headers.get("content-length"));
  if (!productId.success || !request.headers.get("content-type")?.startsWith("multipart/form-data") ||
    !Number.isSafeInteger(contentLength) || contentLength < 1 || contentLength > 6 * 1024 * 1024) {
    return context.finish(adminJson({ message: "Некорректный файл." }, 400));
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const metadata = metadataSchema.safeParse({
      color: form.get("color") || null,
      altText: form.get("altText"),
      sortOrder: form.get("sortOrder") ?? "0",
    });
    if (!(file instanceof File) || !metadata.success) return context.finish(adminJson({ message: "Некорректный файл." }, 400));
    return context.finish(adminJson(await uploadProductImage(productId.data, file, metadata.data), 201));
  } catch (error) {
    if (error instanceof AdminStorageError) {
      const [message, status] = error.code === "INVALID_FILE" ? ["Нужен JPEG, PNG или WebP до 5 МБ.", 400] :
        error.code === "PRODUCT_NOT_FOUND" ? ["Товар не найден.", 404] : ["Загрузка недоступна.", 503];
      return context.finish(adminJson({ message }, status));
    }
    return context.finish(adminErrorResponse(error));
  }
}
