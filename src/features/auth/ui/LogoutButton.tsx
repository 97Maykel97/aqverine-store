"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const logout = async () => {
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (response.ok) {
        router.replace("/");
        router.refresh();
        return;
      }
      setError("Не удалось выйти. Попробуйте позже.");
    } catch {
      setError("Не удалось связаться с сервером.");
    } finally {
      setPending(false);
    }
  };

  return <><button disabled={pending} onClick={logout} type="button">{pending ? "Выходим…" : "Выйти"}</button>{error ? <span role="alert">{error}</span> : null}</>;
}
