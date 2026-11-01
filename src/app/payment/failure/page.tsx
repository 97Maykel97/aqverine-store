import type { Metadata } from "next";
import { Suspense } from "react";
import { z } from "zod";

import { PaymentResultPreview } from "@/features/payments/ui/PaymentResultPreview";
import { PaymentResultLoading, PaymentResultStatus } from "@/features/payments/ui/PaymentResultStatus";

export const metadata: Metadata = { title: "Оплата не подтверждена", robots: { index: false } };

export default function PaymentFailurePage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  return <Suspense fallback={<PaymentResultLoading />}><PaymentContent searchParams={searchParams} /></Suspense>;
}

async function PaymentContent({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const parsed = z.uuid().safeParse((await searchParams).order);
  return parsed.success ? <PaymentResultStatus orderId={parsed.data} /> : <PaymentResultPreview variant="failure" />;
}
