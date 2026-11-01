import type { Metadata } from "next";

import { PaymentResultPreview } from "@/features/payments/ui/PaymentResultPreview";
import { PaymentResultStatus } from "@/features/payments/ui/PaymentResultStatus";
import { z } from "zod";

export const metadata: Metadata = { title: "Статус оплаты", robots: { index: false } };

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const parsed = z.uuid().safeParse((await searchParams).order);
  return parsed.success ? <PaymentResultStatus orderId={parsed.data} /> : <PaymentResultPreview variant="success" />;
}
