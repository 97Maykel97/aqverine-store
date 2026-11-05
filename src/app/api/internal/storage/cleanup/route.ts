import { NextResponse, type NextRequest } from "next/server";

import { processPendingProductImageCleanup } from "@/features/admin/api/admin-storage";
import { isAuthorizedCronRequest } from "@/shared/lib/internal-cron-auth";

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return response({ message: "Доступ запрещён." }, 401);
  try {
    return response(await processPendingProductImageCleanup(), 200);
  } catch {
    console.error("Product image cleanup job failed");
    return response({ message: "Сервис временно недоступен." }, 503);
  }
}
