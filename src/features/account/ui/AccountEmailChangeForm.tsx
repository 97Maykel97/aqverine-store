"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { requestAccountEmailChange } from "@/features/account/api/account-client";
import { accountEmailChangeSchema } from "@/features/account/model/account-input";

import styles from "./AccountEmailChangeForm.module.scss";

type EmailFields = z.infer<typeof accountEmailChangeSchema>;

export function AccountEmailChangeForm({ email }: { email: string }) {
  const form = useForm<EmailFields>({
    resolver: zodResolver(accountEmailChangeSchema),
    mode: "onBlur",
    defaultValues: { email },
    values: { email },
  });
  const changeEmail = useMutation({ mutationFn: requestAccountEmailChange });

  return (
    <section aria-labelledby="account-email-heading" className={styles.section}>
      <h3 id="account-email-heading">Адрес почты</h3>
      <p className={styles.hint}>Новый адрес станет адресом входа после подтверждения по почте.</p>
      <form noValidate onSubmit={form.handleSubmit(async ({ email: nextEmail }) => {
        changeEmail.reset();
        try {
          await changeEmail.mutateAsync(nextEmail);
        } catch {
          // The mutation renders a safe error below the form.
        }
      })}>
        <label htmlFor="account-email">Почта</label>
        <input aria-invalid={Boolean(form.formState.errors.email)} autoComplete="email" id="account-email" type="email" {...form.register("email")} />
        {form.formState.errors.email ? <small role="alert">Введите корректный адрес почты.</small> : null}
        <button disabled={changeEmail.isPending || !form.formState.isDirty} type="submit">
          {changeEmail.isPending ? "Отправляем…" : "Изменить почту"} <span aria-hidden="true">↗</span>
        </button>
        {changeEmail.isSuccess ? <p className={styles.success} role="status">Проверьте почту: подтверждение может прийти на текущий и новый адрес.</p> : null}
        {changeEmail.isError ? <p className={styles.error} role="alert">{changeEmail.error.message === "SESSION_EXPIRED"
          ? <>Сессия завершилась. <Link href="/login">Войти снова</Link></>
          : changeEmail.error.message === "RATE_LIMITED"
            ? "Слишком много попыток. Попробуйте позже."
            : "Не удалось отправить подтверждение. Попробуйте позже."}</p> : null}
      </form>
    </section>
  );
}
