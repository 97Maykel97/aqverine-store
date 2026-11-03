import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getCurrentUser } from "@/features/auth/api/current-user";
import { AdminDashboard } from "@/features/admin/ui/AdminDashboard";
import { UserRole } from "@/generated/prisma/client";

async function AdminContent() {
  await connection();
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) redirect("/aqverine-control/login");

  return <AdminDashboard />;
}

export default function AdminPage() {
  return <Suspense fallback={<p style={{ padding: "4rem var(--page-padding)" }}>Проверяем доступ…</p>}><AdminContent /></Suspense>;
}
