import { NextResponse, type NextRequest } from "next/server";

import { expireStalePaymentSessions } from "@/features/payments/api/expire-stale-sessions";
import { getPaymentProvider } from "@/features/payments/api/stripe-provider";
import { isAuthorizedCronRequest } from "@/shared/lib/internal-cron-auth";

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) return response({ message: "Доступ запрещён." }, 401);

  const provider = getPaymentProvider();
  if (!provider?.expireOpenPayment) return response({ message: "Сервис временно недоступен." }, 503);
  try {
    const result = await expireStalePaymentSessions(provider);
    return response(result, 200);
  } catch {
    console.error("Stale payment session job failed");
    return response({ message: "Не удалось обработать платежи." }, 503);
  }
}
