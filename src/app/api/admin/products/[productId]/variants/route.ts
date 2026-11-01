import type { NextRequest } from "next/server";
import { z } from "zod";

import { adminErrorResponse, adminJson, getAdminRequestContext, readAdminBody } from "@/features/admin/api/admin-http";
import { AdminDomainError, createAdminVariant } from "@/features/admin/api/admin-service";
import { adminVariantCreateSchema } from "@/features/admin/model/admin-input";
import { isSameOrigin } from "@/features/auth/api/http";
import { Prisma } from "@/generated/prisma/client";

export async function POST(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  if (!isSameOrigin(request)) return adminJson({ message: "Недопустимый запрос." }, 403);
  const context = await getAdminRequestContext(request);
  if (!context.ok) return context.response;
  const id = z.uuid().safeParse((await params).productId);
  const input = adminVariantCreateSchema.safeParse(await readAdminBody(request));
  if (!id.success || !input.success) return context.finish(adminJson({ message: "Проверьте данные варианта." }, 400));
  try {
    return context.finish(adminJson(await createAdminVariant(id.data, input.data), 201));
  } catch (error) {
    if (error instanceof AdminDomainError) return context.finish(adminJson({ message: "Товар не найден." }, 404));
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return context.finish(adminJson({ message: "SKU или цвет и размер уже используются." }, 409));
    }
    return context.finish(adminErrorResponse(error));
  }
}
