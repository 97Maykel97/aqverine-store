import type { Metadata } from "next";

import { CheckoutExperience } from "@/features/checkout/ui/CheckoutExperience";

export const metadata: Metadata = { title: "Оформление", robots: { index: false } };

export default function CheckoutPage() {
  const localPayment = process.env.NODE_ENV === "development" && process.env.PAYMENT_PROVIDER === "local";
  return <CheckoutExperience localPayment={localPayment} />;
}
