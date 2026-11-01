import type { NextRequest } from "next/server";
import { z } from "zod";

import { adminErrorResponse, adminJson, getAdminRequestContext, readAdminBody } from "@/features/admin/api/admin-http";
import { AdminDomainError, advanceAdminOrder } from "@/features/admin/api/admin-service";
import { adminOrderStatusSchema } from "@/features/admin/model/admin-input";
import { isSameOrigin } from "@/features/auth/api/http";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  if (!isSameOrigin(request)) return adminJson({ message: "Недопустимый запрос." }, 403);
  const context = await getAdminRequestContext(request);
  if (!context.ok) return context.response;
  const id = z.uuid().safeParse((await params).orderId);
  const input = adminOrderStatusSchema.safeParse(await readAdminBody(request));
  if (!id.success || !input.success) return context.finish(adminJson({ message: "Проверьте статус заказа." }, 400));
  try {
    return context.finish(adminJson(await advanceAdminOrder(id.data, input.data.status)));
  } catch (error) {
    if (error instanceof AdminDomainError) return context.finish(adminJson({ message: "Недопустимый переход статуса заказа." }, 409));
    return context.finish(adminErrorResponse(error));
  }
}
