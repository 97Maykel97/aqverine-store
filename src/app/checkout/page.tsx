import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { getCurrentUser } from "@/features/auth/api/current-user";
import { CheckoutExperience } from "@/features/checkout/ui/CheckoutExperience";
import { getPaymentProvider } from "@/features/payments/api/stripe-provider";
import { UserRole } from "@/generated/prisma/client";

export const metadata: Metadata = { title: "Оформление", robots: { index: false } };

export default function CheckoutPage() {
  return <Suspense fallback={<p role="status" style={{ padding: "4rem var(--page-padding)" }}>Открываем оформление…</p>}>
    <CheckoutContent />
  </Suspense>;
}

async function CheckoutContent() {
  await connection();
  const provider = getPaymentProvider();
  if (provider?.name === "local") {
    const user = await getCurrentUser();
    const localPayment = user?.role === UserRole.ADMIN;
    return <CheckoutExperience localPayment={localPayment} paymentUnavailable={!localPayment} />;
  }
  return <CheckoutExperience paymentUnavailable={!provider} />;
}
