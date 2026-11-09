"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import styles from "./ClientRedirect.module.scss";

export function ClientRedirect({ href, label }: { href: string; label: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return <p className={styles.message} role="status">Доступ закрыт. <Link href={href}>{label}</Link></p>;
}
