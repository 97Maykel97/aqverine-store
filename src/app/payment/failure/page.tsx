import type { Metadata } from "next";

import { PaymentResultPreview } from "@/features/payments/ui/PaymentResultPreview";

export const metadata: Metadata = { title: "Оплата не подтверждена", robots: { index: false } };

export default function PaymentFailurePage() {
  return <PaymentResultPreview variant="failure" />;
}
