"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { findCartVariant } from "@/features/cart/model/guest-cart";
import { useCart } from "@/features/cart/ui/CartProvider";
import { formatPrice, getProductImage } from "@/features/catalog/model/mock-products";
import { checkoutSchema, type CheckoutFields } from "@/features/checkout/model/demo-checkout";

import styles from "./CheckoutExperience.module.scss";

export function CheckoutExperience() {
  const { lines, hydrated } = useCart();
  const [validated, setValidated] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CheckoutFields>({
    resolver: zodResolver(checkoutSchema),
    mode: "onBlur",
    defaultValues: { comment: "", consent: false },
  });
  const items = lines.flatMap((line) => {
    const match = findCartVariant(line.variantId);
    return match ? [{ ...line, ...match }] : [];
  });
  const total = items.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  return (
    <section className={styles.page} aria-labelledby="checkout-title">
      <div className={styles.topline}><span>CHECKOUT / AQVERINE</span><span>ТВОЙ ГОРОД. ТВОИ ПРАВИЛА.</span></div>
      <div className={styles.intro}>
        <div><span>01 / ФИНАЛЬНЫЙ ШТРИХ</span><h1 id="checkout-title">ТВОЙ ВЫБОР.<br />ТВОЙ РИТМ.</h1></div>
        <p>Проверь вещи и контактные данные. Доставка не требуется — здесь только состав заказа и подготовка к оплате.</p>
      </div>

      {!hydrated ? <p className={styles.state} role="status">Загружаем твою корзину…</p> : items.length === 0 ? (
        <div className={styles.empty}>
          <span aria-hidden="true">↗</span><h2>НАЧНИ С ВЕЩИ,<br />КОТОРАЯ ТВОЯ.</h2>
          <p>Корзина пуста. Загляни в коллекцию и добавь то, что подходит твоему ритму.</p>
          <Link href="/catalog">Перейти в каталог <span aria-hidden="true">↗</span></Link>
        </div>
      ) : (
        <div className={styles.columns}>
          <div className={styles.mainColumn}>
            <div className={styles.sectionHeading}><span>01</span><h2>Контактные данные</h2></div>
            <p className={styles.supportText}>В реальном заказе сюда придёт информация о платеже. Сейчас это только локальная демонстрация формы.</p>
            <form className={styles.form} noValidate onSubmit={handleSubmit(() => { setValidated(true); reset(); })}>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="checkout-name">Имя *</label>
                  <input aria-invalid={Boolean(errors.name)} autoComplete="name" id="checkout-name" placeholder="Как к тебе обращаться?" {...register("name")} />
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
                <div className={styles.sectionHeading}><span>02</span><h2>Оплата</h2></div>
                <p>Visa / Mastercard через защищённую страницу платёжного провайдера — после подключения backend. Реквизиты карты здесь не вводятся и не сохраняются.</p>
                <span>ОПЛАТА НЕДОСТУПНА В ДЕМО</span>
              </div>
              <label className={styles.consent}>
                <input aria-invalid={Boolean(errors.consent)} type="checkbox" {...register("consent")} />
                <span>Я понимаю, что это демонстрация: заказ не создаётся и оплата не списывается.</span>
              </label>
              {errors.consent ? <span className={styles.consentError} role="alert">{errors.consent.message}</span> : null}
              <button className={styles.submit} type="submit">Проверить заполнение <span aria-hidden="true">↗</span></button>
              {validated ? <p className={styles.validated} role="status">Данные прошли проверку. Заказ не создан, оплата не началась и контактные данные никуда не отправлены.</p> : null}
            </form>
          </div>
          <aside className={styles.summary} aria-label="Состав корзины">
            <div className={styles.summaryHeading}><span>ТВОЙ ВЫБОР</span><strong>{items.length} {items.length === 1 ? "позиция" : "позиции"}</strong></div>
            <div className={styles.items}>
              {items.map(({ variantId, quantity, product, variant }) => {
                const image = getProductImage(product, variant.color);
                return (
                  <div className={styles.item} key={variantId}>
                    <div className={styles.itemPhoto}><Image alt={image.alt} fill sizes="88px" src={image.src} /></div>
                    <div><Link href={`/products/${product.slug}?color=${encodeURIComponent(variant.color)}`}>{product.name}</Link><span>{variant.color} / {variant.size} · {quantity} шт.</span><strong>{formatPrice(product.price * quantity)}</strong></div>
                  </div>
                );
              })}
            </div>
            <div className={styles.total}><span>Итого</span><strong>{formatPrice(total)}</strong></div>
            <p>Финальная цена и наличие будут подтверждены сервером при настоящем оформлении. В демо списаний нет.</p>
            <Link className={styles.backLink} href="/catalog">← Продолжить покупки</Link>
          </aside>
        </div>
      )}
    </section>
  );
}
