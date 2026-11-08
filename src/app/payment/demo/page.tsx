import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getCurrentUser } from "@/features/auth/api/current-user";
import { LocalPaymentProvider } from "@/features/payments/api/local-payment-provider";
import { getPaymentProvider } from "@/features/payments/api/stripe-provider";
import { LocalPaymentExperience } from "@/features/payments/ui/LocalPaymentExperience";
import { OrderStatus, PaymentStatus, UserRole } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";

export const metadata: Metadata = { title: "Проверка оплаты", robots: { index: false }, referrer: "no-referrer" };

export default function LocalPaymentPage({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  return <Suspense fallback={<p style={{ padding: "4rem var(--page-padding)" }}>Открываем проверку оплаты…</p>}>
    <LocalPaymentContent searchParams={searchParams} />
  </Suspense>;
}

async function LocalPaymentContent({ searchParams }: { searchParams: Promise<{ session?: string }> }) {
  await connection();
  const provider = getPaymentProvider();
  if (!(provider instanceof LocalPaymentProvider)) notFound();
  const token = (await searchParams).session;
  const session = token ? provider.readSession(token) : null;
  if (!session || !token) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  if (user.role !== UserRole.ADMIN) notFound();
  const payment = await getPrisma().payment.findUnique({
    where: { id: session.paymentId },
    select: {
      provider: true, providerPaymentId: true, status: true, amountMinor: true, currency: true,
      order: { select: { id: true, userId: true, number: true, status: true } },
    },
  });
  if (!payment || payment.provider !== provider.name || payment.providerPaymentId !== token ||
    payment.order.id !== session.orderId || payment.order.userId !== user.id ||
    payment.amountMinor !== session.amountMinor || payment.currency !== session.currency) notFound();
  if (payment.status !== PaymentStatus.PENDING || payment.order.status !== OrderStatus.PENDING_PAYMENT) {
    const path = payment.status === PaymentStatus.PAID ? "/payment/success" : "/payment/failure";
    redirect(`${path}?order=${session.orderId}`);
  }

  return <LocalPaymentExperience amountMinor={session.amountMinor} orderNumber={payment.order.number} session={token} />;
}
