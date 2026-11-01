import type { NextRequest } from "next/server";
import { z } from "zod";

import { adminErrorResponse, adminJson, getAdminRequestContext } from "@/features/admin/api/admin-http";
import { listAdminOrders } from "@/features/admin/api/admin-service";

const paginationSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1) });

export async function GET(request: NextRequest) {
  const context = await getAdminRequestContext(request);
  if (!context.ok) return context.response;
  const parsed = paginationSchema.safeParse({ page: request.nextUrl.searchParams.get("page") ?? undefined });
  if (!parsed.success) return context.finish(adminJson({ message: "Некорректная страница." }, 400));
  try {
    return context.finish(adminJson(await listAdminOrders(parsed.data.page, 25)));
  } catch (error) {
    return context.finish(adminErrorResponse(error));
  }
}
