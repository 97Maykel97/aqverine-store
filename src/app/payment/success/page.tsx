import type { Metadata } from "next";

import { PaymentResultPreview } from "@/features/payments/ui/PaymentResultPreview";

export const metadata: Metadata = { title: "Статус оплаты", robots: { index: false } };

export default function PaymentSuccessPage() {
  return <PaymentResultPreview variant="success" />;
}
