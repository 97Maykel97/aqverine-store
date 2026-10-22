import type { Metadata } from "next";

import { AccountPreview } from "@/features/account/ui/AccountPreview";

export const metadata: Metadata = { title: "Личный кабинет", robots: { index: false } };

export default function AccountPage() {
  return <AccountPreview />;
}
