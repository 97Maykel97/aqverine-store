import type { Metadata } from "next";

import { CheckoutExperience } from "@/features/checkout/ui/CheckoutExperience";

export const metadata: Metadata = { title: "Оформление", robots: { index: false } };

export default function CheckoutPage() {
  return <CheckoutExperience />;
}
