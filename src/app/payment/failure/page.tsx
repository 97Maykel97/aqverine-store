import type { Metadata } from "next";

import { PaymentResultPreview } from "@/features/payments/ui/PaymentResultPreview";
import { PaymentResultStatus } from "@/features/payments/ui/PaymentResultStatus";
import { z } from "zod";

export const metadata: Metadata = { title: "Оплата не подтверждена", robots: { index: false } };

export default async function PaymentFailurePage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const parsed = z.uuid().safeParse((await searchParams).order);
  return parsed.success ? <PaymentResultStatus orderId={parsed.data} /> : <PaymentResultPreview variant="failure" />;
}
