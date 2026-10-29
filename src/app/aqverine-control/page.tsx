import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getCurrentUser } from "@/features/auth/api/current-user";
import { UserRole } from "@/generated/prisma/client";

import styles from "./login/page.module.scss";

async function AdminContent() {
  await connection();
  const user = await getCurrentUser();
  if (!user || user.role !== UserRole.ADMIN) redirect("/aqverine-control/login");

  return (
    <section className={styles.page} aria-labelledby="admin-title">
      <div className={styles.frame}>
        <div className={styles.top}><strong>AQVERINE / CONTROL</strong><span>ADMIN VERIFIED</span></div>
        <div className={styles.content}>
          <span className={styles.eyebrow}>ДОСТУП ПОДТВЕРЖДЁН</span>
          <h1 id="admin-title">ТВОЯ<br /><em>ПАНЕЛЬ.</em></h1>
          <p>Управление товарами и заказами появится после подключения серверного API.</p>
        </div>
        <div className={styles.bottom}><span>AQVERINE CONTROL</span><span>ROLE: ADMIN</span></div>
      </div>
    </section>
  );
}

export default function AdminPage() {
  return <Suspense fallback={<p style={{ padding: "4rem var(--page-padding)" }}>Проверяем доступ…</p>}><AdminContent /></Suspense>;
}
