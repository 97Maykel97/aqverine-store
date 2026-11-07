"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { findCartVariant } from "@/features/cart/model/guest-cart";
import { useCart } from "@/features/cart/ui/CartProvider";
import { formatPrice, getProductImage } from "@/features/catalog/model/mock-products";
import { checkoutSchema, type CheckoutFields } from "@/features/checkout/model/demo-checkout";

import styles from "./CheckoutExperience.module.scss";

export function CheckoutExperience({ localPayment = false }: { localPayment?: boolean }) {
  const { lines, catalogProducts, serverCart, serverEnabled, serverUnavailable, syncing, hydrated } = useCart();
  const [localDestination, setLocalDestination] = useState("");
  const [validated, setValidated] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submissionKey, setSubmissionKey] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CheckoutFields>({
    resolver: zodResolver(checkoutSchema),
    mode: "onBlur",
    defaultValues: { comment: "", consent: false },
  });
  const items = serverCart ? serverCart.items.map((item) => {
    const match = findCartVariant(item.sku, catalogProducts);
    const fallbackImage = match ? getProductImage(match.product, item.color) : null;
    return {
      variantId: item.sku,
      quantity: item.quantity,
      name: item.name,
      slug: item.slug,
      color: item.color,
      size: item.size,
      unitPriceMinor: item.unitPriceMinor,
      image: item.imageUrl ?? fallbackImage?.src ?? null,
      imageAlt: fallbackImage?.alt ?? `${item.name}, цвет ${item.color}`,
    };
  }) : lines.flatMap((line) => {
    const match = findCartVariant(line.variantId, catalogProducts);
    if (!match) return [];
    const image = getProductImage(match.product, match.variant.color);
    return [{
      variantId: line.variantId,
      quantity: line.quantity,
      name: match.product.name,
      slug: match.product.slug,
      color: match.variant.color,
      size: match.variant.size,
      unitPriceMinor: match.variant.priceMinor ?? match.product.price,
      image: image.src,
      imageAlt: image.alt,
    }];
  });
  const total = serverCart?.totalMinor ?? items.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0);

  const submit = async (values: CheckoutFields) => {
    setSubmitError("");
    if (!serverCart) {
      setValidated(true);
      reset();
      return;
    }
    const idempotencyKey = submissionKey ?? window.crypto.randomUUID();
    if (!submissionKey) setSubmissionKey(idempotencyKey);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          name: values.name,
          email: values.email,
          phone: values.phone,
          comment: values.comment,
          consent: values.consent,
        }),
      });
      const raw = await response.json() as unknown;
      if (!response.ok) {
        const message = z.object({ message: z.string() }).safeParse(raw);
        setSubmitError(message.success ? message.data.message : "Не удалось оформить заказ. Повторите попытку.");
        return;
      }
      const result = z.object({ redirectUrl: z.url(), orderId: z.uuid() }).parse(raw);
      if (localPayment) {
        const destination = new URL(result.redirectUrl);
        if (destination.origin !== window.location.origin) throw new Error("Unexpected payment destination");
        setLocalDestination(`${destination.pathname}${destination.search}`);
      } else {
        window.location.assign(result.redirectUrl);
      }
    } catch {
      setSubmitError("Не удалось связаться с сервером. Повторите попытку.");
    }
  };

  return (
    <section className={styles.page} aria-labelledby="checkout-title">
      {localDestination ? <LocalPaymentRedirect destination={localDestination} /> : null}
      <div className={styles.topline}><span>CHECKOUT / AQVERINE</span><span>ТВОЙ ГОРОД. ТВОИ ПРАВИЛА.</span></div>
      <div className={styles.intro}>
        <div><span>ФИНАЛЬНЫЙ ШТРИХ</span><h1 id="checkout-title">ТВОЙ ВЫБОР.<br />ТВОЙ РИТМ.</h1></div>
        <p>Проверь вещи и контактные данные. Доставка не требуется — здесь только состав заказа и подготовка к оплате.</p>
      </div>

      {!hydrated || (serverEnabled && syncing) ? <p className={styles.state} role="status">Загружаем твою корзину…</p> : items.length === 0 ? (
        <div className={styles.empty}>
          <span aria-hidden="true">↗</span><h2>НАЧНИ С ВЕЩИ,<br />КОТОРАЯ ТВОЯ.</h2>
          <p>Корзина пуста. Загляни в коллекцию и добавь то, что подходит твоему ритму.</p>
          <Link href="/catalog">Перейти в каталог <span aria-hidden="true">↗</span></Link>
        </div>
      ) : (
        <div className={styles.columns}>
          <div className={styles.mainColumn}>
            <div className={styles.sectionHeading}><h2>Контактные данные</h2></div>
            <p className={styles.supportText}>{serverCart ? localPayment ? "Проверь контактные данные. После оформления ты перейдёшь к локальной проверке заказа без списания денег." : "Проверь контактные данные. После оформления ты перейдёшь на защищённую страницу Stripe Checkout." : "В реальном заказе сюда придёт информация о платеже. Сейчас это только локальная демонстрация формы."}</p>
            {serverEnabled && !serverCart ? (
              <div className={styles.authNotice}>
                <p>{serverUnavailable ? "Серверная корзина временно недоступна. Попробуй обновить страницу позже." : "Войди в аккаунт, чтобы перенести корзину и перейти к оплате."}</p>
                {!serverUnavailable ? <Link href="/login?next=/checkout">Войти для оформления <span aria-hidden="true">↗</span></Link> : null}
              </div>
            ) : <form className={styles.form} noValidate onSubmit={handleSubmit(submit)}>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="checkout-name">Имя *</label>
                  <input aria-invalid={Boolean(errors.name)} autoComplete="name" id="checkout-name" placeholder="Ваше имя" {...register("name")} />
                  {errors.name ? <span role="alert">{errors.name.message}</span> : null}
                </div>
                <div className={styles.field}>
                  <label htmlFor="checkout-phone">Телефон *</label>
                  <input aria-invalid={Boolean(errors.phone)} autoComplete="tel" id="checkout-phone" placeholder="+1 555 123 4567" type="tel" {...register("phone")} />
                  {errors.phone ? <span role="alert">{errors.phone.message}</span> : null}
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="checkout-email">Электронная почта *</label>
                <input aria-invalid={Boolean(errors.email)} autoComplete="email" id="checkout-email" placeholder="you@example.com" type="email" {...register("email")} />
                {errors.email ? <span role="alert">{errors.email.message}</span> : null}
              </div>
              <div className={styles.field}>
                <label htmlFor="checkout-comment">Комментарий к заказу</label>
                <textarea aria-invalid={Boolean(errors.comment)} id="checkout-comment" placeholder="Если хочешь что-то уточнить" rows={3} {...register("comment")} />
                {errors.comment ? <span role="alert">{errors.comment.message}</span> : null}
              </div>
              <div className={styles.paymentBlock}>
                <div className={styles.sectionHeading}><h2>Оплата</h2></div>
                <p>{serverCart ? localPayment ? "Локальная проверка оплаты без банковской карты и списания денег. Выбери результат на следующем экране." : "Visa / Mastercard через защищённый Stripe Checkout. Реквизиты карты не проходят через AQVERINE." : "Visa / Mastercard через защищённую страницу платёжного провайдера — после подключения backend. Реквизиты карты здесь не вводятся и не сохраняются."}</p>
                <span>{serverCart ? "ТЕСТОВЫЙ РЕЖИМ ОПЛАТЫ" : "ОПЛАТА НЕДОСТУПНА В ДЕМО"}</span>
              </div>
              <label className={styles.consent}>
                <input aria-invalid={Boolean(errors.consent)} type="checkbox" {...register("consent")} />
                <span>{serverCart ? localPayment ? "Я подтверждаю контактные данные и состав заказа. Понимаю, что это локальная проверка без реальной оплаты." : "Я подтверждаю контактные данные и состав заказа. Оплата выполняется в тестовом режиме Stripe." : "Я понимаю, что это демонстрация: заказ не создаётся и оплата не списывается."}</span>
              </label>
              {errors.consent ? <span className={styles.consentError} role="alert">{errors.consent.message}</span> : null}
              <button className={styles.submit} disabled={isSubmitting} type="submit">{isSubmitting ? "Подготавливаем оплату…" : serverCart ? "Перейти к оплате" : "Продолжить в демо"} <span aria-hidden="true">↗</span></button>
              {submitError ? <p className={styles.formError} role="alert">{submitError}</p> : null}
              {validated ? <p className={styles.validated} role="status">Данные прошли проверку. Заказ не создан, оплата не началась и контактные данные никуда не отправлены.</p> : null}
            </form>}
          </div>
          <aside className={styles.summary} aria-label="Состав корзины">
            <div className={styles.summaryHeading}><span>ТВОЙ ВЫБОР</span><strong>{items.length} {items.length === 1 ? "позиция" : "позиции"}</strong></div>
            <div className={styles.items}>
              {items.map(({ variantId, quantity, name, slug, color, size, unitPriceMinor, image, imageAlt }) => {
                return (
                  <div className={styles.item} key={variantId}>
                    <div className={styles.itemPhoto}>{image ? <Image alt={imageAlt} fill sizes="88px" src={image} /> : <span aria-hidden="true">AQVERINE</span>}</div>
                    <div><Link href={`/products/${slug}?color=${encodeURIComponent(color)}`}>{name}</Link><span>{color} / {size} · {quantity} шт.</span><strong>{formatPrice(unitPriceMinor * quantity)}</strong></div>
                  </div>
                );
              })}
            </div>
            <div className={styles.total}><span>Итого</span><strong>{formatPrice(total)}</strong></div>
            <p>{serverCart ? localPayment ? "Цена и наличие будут повторно подтверждены сервером перед локальной проверкой оплаты." : "Цена и наличие будут повторно подтверждены сервером перед переходом к Stripe Checkout." : "Финальная цена и наличие будут подтверждены сервером при настоящем оформлении. В демо списаний нет."}</p>
            <Link className={styles.backLink} href="/catalog">← Продолжить покупки</Link>
          </aside>
        </div>
      )}
    </section>
  );
}

function LocalPaymentRedirect({ destination }: { destination: string }) {
  const router = useRouter();
  useEffect(() => { router.push(destination); }, [destination, router]);
  return <span className={styles.state} role="status">Переходим к проверке оплаты…</span>;
}
