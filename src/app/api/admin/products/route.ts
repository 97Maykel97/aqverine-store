import type { NextRequest } from "next/server";
import { z } from "zod";

import { adminErrorResponse, adminJson, getAdminRequestContext, readAdminBody } from "@/features/admin/api/admin-http";
import { createAdminProduct, listAdminProducts } from "@/features/admin/api/admin-service";
import { adminProductCreateSchema } from "@/features/admin/model/admin-input";
import { isSameOrigin } from "@/features/auth/api/http";
import { Prisma } from "@/generated/prisma/client";

const paginationSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) });

export async function GET(request: NextRequest) {
  const context = await getAdminRequestContext(request);
  if (!context.ok) return context.response;
  const parsed = paginationSchema.safeParse({ page: request.nextUrl.searchParams.get("page") ?? undefined });
  if (!parsed.success) return context.finish(adminJson({ message: "Некорректная страница." }, 400));
  try {
    return context.finish(adminJson(await listAdminProducts(parsed.data.page, 25)));
  } catch (error) {
    return context.finish(adminErrorResponse(error));
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return adminJson({ message: "Недопустимый запрос." }, 403);
  const context = await getAdminRequestContext(request);
  if (!context.ok) return context.response;
  const parsed = adminProductCreateSchema.safeParse(await readAdminBody(request));
  if (!parsed.success) return context.finish(adminJson({ message: "Проверьте данные товара." }, 400));
  try {
    return context.finish(adminJson(await createAdminProduct(parsed.data), 201));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return context.finish(adminJson({ message: "Slug, SKU или вариант уже используется." }, 409));
    }
    return context.finish(adminErrorResponse(error));
  }
}
