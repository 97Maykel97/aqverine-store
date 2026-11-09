import { connection } from "next/server";
import { Suspense } from "react";

import { getCurrentUser } from "@/features/auth/api/current-user";
import { AdminDashboard } from "@/features/admin/ui/AdminDashboard";
import { UserRole } from "@/generated/prisma/client";
import { ClientRedirect } from "@/shared/ui/ClientRedirect";

async function AdminContent() {
  await connection();
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) {
    return <ClientRedirect href="/aqverine-control/login" label="Перейти к входу в панель" />;
  }

  return <AdminDashboard />;
}

export default function AdminPage() {
  return <Suspense fallback={<p style={{ padding: "4rem var(--page-padding)" }}>Проверяем доступ…</p>}><AdminContent /></Suspense>;
}
