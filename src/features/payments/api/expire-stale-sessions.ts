import { OrderStatus, PaymentStatus } from "@/generated/prisma/client";

import type { PaymentProvider } from "@/features/payments/model/payment-provider";
import { getPrisma } from "@/shared/lib/prisma";

const SESSION_GRACE_MS = 25 * 60 * 1000;
const MAX_SESSIONS_PER_RUN = 100;

export async function expireStalePaymentSessions(provider: PaymentProvider, now = new Date()) {
  if (!provider.expireOpenPayment) throw new Error("Payment provider does not support session expiration");
  const expireOpenPayment = provider.expireOpenPayment.bind(provider);
  const sessions = await getPrisma().payment.findMany({
    where: {
      provider: provider.name,
      status: PaymentStatus.PENDING,
      providerPaymentId: { not: null },
      updatedAt: { lt: new Date(now.getTime() - SESSION_GRACE_MS) },
      order: { status: OrderStatus.PENDING_PAYMENT },
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: MAX_SESSIONS_PER_RUN,
    select: { providerPaymentId: true },
  });

  let expired = 0;
  let skipped = 0;
  let failed = 0;
  for (const session of sessions) {
    if (!session.providerPaymentId) continue;
    try {
      if (await expireOpenPayment(session.providerPaymentId)) expired += 1;
      else skipped += 1;
    } catch {
      failed += 1;
      console.error("Stale payment session expiration failed");
    }
  }
  return { inspected: sessions.length, expired, skipped, failed };
}
