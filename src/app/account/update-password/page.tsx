import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getCurrentUser } from "@/features/auth/api/current-user";
import { UpdatePasswordForm } from "@/features/auth/ui/UpdatePasswordForm";

export const metadata: Metadata = { title: "Смена пароля", robots: { index: false } };

async function UpdatePasswordContent() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <UpdatePasswordForm />;
}

export default function UpdatePasswordPage() {
  return <Suspense fallback={<p style={{ padding: "4rem var(--page-padding)" }}>Открываем настройки…</p>}><UpdatePasswordContent /></Suspense>;
}
