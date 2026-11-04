import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { expireStalePaymentSessions } from "@/features/payments/api/expire-stale-sessions";
import { getPaymentProvider } from "@/features/payments/api/stripe-provider";

const tokenSchema = z.string().min(32).max(512);

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function POST(request: NextRequest) {
  const expected = tokenSchema.safeParse(process.env.CRON_SECRET);
  const authorization = request.headers.get("authorization");
  const supplied = tokenSchema.safeParse(authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined);
  if (!expected.success || !supplied.success) return response({ message: "Доступ запрещён." }, 401);
  const expectedHash = createHash("sha256").update(expected.data).digest();
  const suppliedHash = createHash("sha256").update(supplied.data).digest();
  if (!timingSafeEqual(expectedHash, suppliedHash)) return response({ message: "Доступ запрещён." }, 401);

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
