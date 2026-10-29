"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import styles from "./UpdatePasswordForm.module.scss";

const schema = z.object({
  password: z.string().min(8, "Не менее 8 символов").max(128),
  confirmation: z.string(),
}).refine((values) => values.password === values.confirmation, {
  path: ["confirmation"], message: "Пароли не совпадают",
});

type Fields = z.infer<typeof schema>;

export function UpdatePasswordForm() {
  const [feedback, setFeedback] = useState("");
  const [succeeded, setSucceeded] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema), mode: "onBlur",
  });

  const submit = async ({ password }: Fields) => {
    setFeedback("");
    try {
      const response = await fetch("/api/auth/password-update", {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body: unknown = await response.json();
      const message = z.object({ message: z.string().optional() }).safeParse(body);
      setSucceeded(response.ok);
      setFeedback(response.ok ? "Пароль обновлён." : message.success ? message.data.message ?? "Не удалось сменить пароль." : "Не удалось сменить пароль.");
      if (response.ok) reset();
    } catch {
      setSucceeded(false);
      setFeedback("Не удалось связаться с сервером.");
    }
  };

  return (
    <section className={styles.page} aria-labelledby="password-title">
      <div className={styles.panel}>
        <span>AQVERINE / ACCOUNT</span>
        <h1 id="password-title">НОВЫЙ<br /><em>ПАРОЛЬ.</em></h1>
        <p>Выбери новый пароль для своего аккаунта.</p>
        <form noValidate onSubmit={handleSubmit(submit)}>
          <label htmlFor="new-password">Новый пароль</label>
          <input aria-invalid={Boolean(errors.password)} autoComplete="new-password" id="new-password" type="password" {...register("password")} />
          {errors.password ? <small role="alert">{errors.password.message}</small> : null}
          <label htmlFor="confirm-password">Повтори пароль</label>
          <input aria-invalid={Boolean(errors.confirmation)} autoComplete="new-password" id="confirm-password" type="password" {...register("confirmation")} />
          {errors.confirmation ? <small role="alert">{errors.confirmation.message}</small> : null}
          <button disabled={isSubmitting} type="submit">{isSubmitting ? "Сохраняем…" : "Сохранить пароль"} <span aria-hidden="true">↗</span></button>
          {feedback ? <p className={succeeded ? styles.success : styles.error} role={succeeded ? "status" : "alert"}>{feedback}</p> : null}
        </form>
        <Link href="/account">← Вернуться в аккаунт</Link>
      </div>
    </section>
  );
}
