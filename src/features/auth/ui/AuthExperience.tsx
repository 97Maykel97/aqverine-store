"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import {
  loginSchema,
  passwordResetSchema,
  registrationSchema,
  type LoginFields,
  type PasswordResetFields,
  type RegistrationFields,
} from "@/features/auth/model/demo-auth";

import styles from "./AuthExperience.module.scss";

type AuthMode = "login" | "register" | "reset";

const pages: Record<AuthMode, { eyebrow: string; heading: string; subheading: string }> = {
  login: {
    eyebrow: "ТВОЁ ПРОСТРАНСТВО",
    heading: "СНОВА\nВ РИТМЕ.",
    subheading: "Один аккаунт — твои вещи, заказы и новые маршруты.",
  },
  register: {
    eyebrow: "НОВЫЙ МАРШРУТ",
    heading: "ВХОДИ\nВ РИТМ.",
    subheading: "Создай своё пространство AQVERINE.",
  },
  reset: {
    eyebrow: "ВОССТАНОВЛЕНИЕ",
    heading: "ВЕРНЁМСЯ\nВМЕСТЕ.",
    subheading: "Укажи email, чтобы восстановить доступ после подключения сервиса.",
  },
};

export function AuthExperience({ mode }: { mode: AuthMode }) {
  const content = pages[mode];

  return (
    <section className={styles.page} aria-labelledby="auth-title">
      <div className={styles.visual}>
        <Image
          alt="Модели AQVERINE в городской одежде на фоне оранжевой стены"
          className={styles.photo}
          fill
          priority
          sizes="(max-width: 760px) 100vw, 52vw"
          src="/images/hero-city.png"
        />
        <div className={styles.visualTop}><span>AQVERINE / MEMBERS</span><span>ТВОЙ ГОРОД. ТВОИ ПРАВИЛА.</span></div>
        <div className={styles.visualBottom}>ОДЕЖДА ДЛЯ ЖИЗНИ<br />В ДВИЖЕНИИ <span aria-hidden="true">↗</span></div>
      </div>
      <div className={styles.content}>
        <div className={styles.contentInner}>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>{content.eyebrow}</span>
            <h1 id="auth-title">{content.heading}</h1>
            <p>{content.subheading}</p>
          </div>
          <div className={styles.formCard}>
            <div className={styles.formHeading}>
              <h2>{mode === "login" ? "Войти в аккаунт" : mode === "register" ? "Создать аккаунт" : "Восстановить доступ"}</h2>
              {mode === "login" ? <Link href="/register">Нет аккаунта? Создать ↗</Link> : null}
            </div>
            <p className={styles.demoNotice}><strong>ДЕМО-РЕЖИМ</strong> Можно посмотреть работу формы на вымышленных данных. Вход, регистрация и отправка письма пока не работают; данные никуда не передаются.</p>
            {mode === "login" ? <LoginForm /> : mode === "register" ? <RegistrationForm /> : <ResetForm />}
            <div className={styles.formFooter}>
              {mode === "register" ? <p>Уже есть аккаунт? <Link href="/login">Войти ↗</Link></p> : null}
              {mode === "reset" ? <Link href="/login">← Вернуться ко входу</Link> : null}
            </div>
          </div>
          <span className={styles.aside}>ТВОЙ СТИЛЬ. ТВОЯ ТЕРРИТОРИЯ. AQVERINE.</span>
        </div>
      </div>
    </section>
  );
}

function LoginForm() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema), mode: "onBlur",
  });

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit(() => { setSubmitted(true); setValue("password", ""); })}>
      <label htmlFor="login-email">Электронная почта</label>
      <input aria-invalid={Boolean(errors.email)} autoComplete="email" id="login-email" placeholder="you@example.com" type="email" {...register("email")} />
      {errors.email ? <span className={styles.error} role="alert">{errors.email.message}</span> : null}
      <div className={styles.labelRow}><label htmlFor="login-password">Пароль</label><Link href="/forgot-password">Забыли пароль?</Link></div>
      <input aria-invalid={Boolean(errors.password)} autoComplete="current-password" id="login-password" placeholder="Не менее 8 символов" type="password" {...register("password")} />
      {errors.password ? <span className={styles.error} role="alert">{errors.password.message}</span> : null}
      <button className={styles.submit} type="submit">Продолжить в демо <span aria-hidden="true">↗</span></button>
      {submitted ? <p className={styles.confirmation} role="status">Форма заполнена верно. Вход не выполнен: серверная авторизация ещё не подключена.</p> : null}
    </form>
  );
}

function RegistrationForm() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<RegistrationFields>({
    resolver: zodResolver(registrationSchema), mode: "onBlur",
  });

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit(() => { setSubmitted(true); reset(); })}>
      <label htmlFor="register-name">Имя</label>
      <input aria-invalid={Boolean(errors.name)} autoComplete="name" id="register-name" placeholder="Ваше имя" {...register("name")} />
      {errors.name ? <span className={styles.error} role="alert">{errors.name.message}</span> : null}
      <label htmlFor="register-email">Электронная почта</label>
      <input aria-invalid={Boolean(errors.email)} autoComplete="email" id="register-email" placeholder="you@example.com" type="email" {...register("email")} />
      {errors.email ? <span className={styles.error} role="alert">{errors.email.message}</span> : null}
      <label htmlFor="register-password">Пароль</label>
      <input aria-invalid={Boolean(errors.password)} autoComplete="new-password" id="register-password" placeholder="Не менее 8 символов" type="password" {...register("password")} />
      {errors.password ? <span className={styles.error} role="alert">{errors.password.message}</span> : null}
      <label htmlFor="register-confirmation">Повтори пароль</label>
      <input aria-invalid={Boolean(errors.confirmation)} autoComplete="new-password" id="register-confirmation" placeholder="Повтори пароль" type="password" {...register("confirmation")} />
      {errors.confirmation ? <span className={styles.error} role="alert">{errors.confirmation.message}</span> : null}
      <button className={styles.submit} type="submit">Продолжить в демо <span aria-hidden="true">↗</span></button>
      {submitted ? <p className={styles.confirmation} role="status">Поля прошли проверку. Аккаунт не создан: Supabase Auth ещё не подключён.</p> : null}
    </form>
  );
}

function ResetForm() {
  const [submitted, setSubmitted] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordResetFields>({
    resolver: zodResolver(passwordResetSchema), mode: "onBlur",
  });

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit(() => { setSubmitted(true); reset(); })}>
      <label htmlFor="reset-email">Электронная почта</label>
      <input aria-invalid={Boolean(errors.email)} autoComplete="email" id="reset-email" placeholder="you@example.com" type="email" {...register("email")} />
      {errors.email ? <span className={styles.error} role="alert">{errors.email.message}</span> : null}
      <button className={styles.submit} type="submit">Продолжить в демо <span aria-hidden="true">↗</span></button>
      {submitted ? <p className={styles.confirmation} role="status">Формат email проверен. Письмо не отправлено: восстановление доступа ещё не подключено.</p> : null}
    </form>
  );
}
