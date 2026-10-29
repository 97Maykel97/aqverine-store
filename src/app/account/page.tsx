import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getCurrentUser } from "@/features/auth/api/current-user";
import { isAuthConfigured } from "@/features/auth/model/auth-config";
import { AccountPreview } from "@/features/account/ui/AccountPreview";
import { AccountDashboard } from "@/features/account/ui/AccountDashboard";

export const metadata: Metadata = { title: "Личный кабинет", robots: { index: false } };

async function AccountContent() {
  await connection();
  if (!isAuthConfigured()) return <AccountPreview />;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <AccountDashboard email={user.email} name={user.profile?.fullName} />;
}

export default function AccountPage() {
  return <Suspense fallback={<p style={{ padding: "4rem var(--page-padding)" }}>Открываем кабинет…</p>}><AccountContent /></Suspense>;
}
