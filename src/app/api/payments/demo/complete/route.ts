import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { accountJson, getAccountRequestContext, readAccountBody } from "@/features/account/api/account-http";
import { isSameOrigin } from "@/features/auth/api/http";
import { allowAuthAttempt } from "@/features/auth/model/rate-limit";
import { LocalPaymentProvider } from "@/features/payments/api/local-payment-provider";
import { getPaymentProvider } from "@/features/payments/api/stripe-provider";
import { OrderStatus, PaymentStatus, UserRole } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";

const inputSchema = z.object({
  session: z.string().min(1).max(1024),
  outcome: z.enum(["paid", "failed", "cancelled"]),
}).strict();

function resultUrl(orderId: string, paid: boolean) {
  const path = paid ? "/payment/success" : "/payment/failure";
  const url = new URL(path, process.env.NEXT_PUBLIC_APP_URL);
  url.searchParams.set("order", orderId);
  return url.toString();
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return accountJson({ message: "Недопустимый запрос." }, 403);
  const input = inputSchema.safeParse(await readAccountBody(request));
  if (!input.success) return accountJson({ message: "Проверьте действие." }, 400);

  const context = await getAccountRequestContext(request);
  if (!context.ok) return context.response;
  if (context.role === UserRole.USER) {
    return context.finish(accountJson({ message: "Недоступный запрос." }, 403));
  }
  if (!allowAuthAttempt("payment-demo", context.userId, 10)) {
    return context.finish(accountJson({ message: "Слишком много попыток. Повторите позже." }, 429));
  }

  const provider = getPaymentProvider();
  if (!(provider instanceof LocalPaymentProvider)) return context.finish(accountJson({ message: "Страница недоступна." }, 404));
  const session = provider.readSession(input.data.session);
  if (!session) return context.finish(accountJson({ message: "Платёж не найден." }, 404));

  try {
    const payment = await getPrisma().payment.findUnique({
      where: { id: session.paymentId },
      select: {
        provider: true, providerPaymentId: true, status: true, amountMinor: true, currency: true,
        order: { select: { id: true, userId: true, status: true } },
      },
    });
    if (!payment || payment.provider !== provider.name || payment.providerPaymentId !== input.data.session ||
      payment.order.id !== session.orderId || payment.order.userId !== context.userId ||
      payment.amountMinor !== session.amountMinor || payment.currency !== session.currency) {
      return context.finish(accountJson({ message: "Платёж не найден." }, 404));
    }

    const targetStatus = input.data.outcome === "paid" ? PaymentStatus.PAID :
      input.data.outcome === "failed" ? PaymentStatus.FAILED : PaymentStatus.CANCELLED;
    if (payment.status === targetStatus) {
      return context.finish(accountJson({ redirectUrl: resultUrl(session.orderId, input.data.outcome === "paid") }));
    }
    if (payment.status !== PaymentStatus.PENDING || payment.order.status !== OrderStatus.PENDING_PAYMENT) {
      return context.finish(accountJson({ message: "Статус платежа уже изменён." }, 409));
    }

    const event = provider.createSignedEvent(input.data.session, input.data.outcome);
    const webhook = await fetch(new URL("/api/payments/webhook", process.env.NEXT_PUBLIC_APP_URL), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-aqverine-demo-signature": event.signature },
      body: event.rawBody,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!webhook.ok) throw new Error("Local payment webhook failed");

    const updated = await getPrisma().payment.findUnique({ where: { id: session.paymentId }, select: { status: true } });
    if (updated?.status !== targetStatus) throw new Error("Local payment event was not applied");
    return context.finish(NextResponse.json({ redirectUrl: resultUrl(session.orderId, input.data.outcome === "paid") }, {
      headers: { "Cache-Control": "private, no-store" },
    }));
  } catch {
    console.error("Local payment simulation failed");
    return context.finish(accountJson({ message: "Не удалось завершить проверку оплаты. Повторите попытку." }, 503));
  }
}
