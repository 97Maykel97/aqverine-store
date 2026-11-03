"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { findCartVariant } from "@/features/cart/model/guest-cart";
import { useCart } from "@/features/cart/ui/CartProvider";
import { formatPrice, getProductImage } from "@/features/catalog/model/mock-products";

import styles from "./CartDrawer.module.scss";

export function CartDrawer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { lines, catalogProducts, serverCart, syncing, error, isOpen, closeCart, setQuantity } = useCart();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      const frame = window.requestAnimationFrame(() => { dialog.dataset.state = "open"; });
      return () => window.cancelAnimationFrame(frame);
    }
    if (dialog.open) {
      dialog.dataset.state = "closed";
      const timer = window.setTimeout(() => dialog.close(), 240);
      return () => window.clearTimeout(timer);
    }
  }, [isOpen]);

  const resolvedLines = lines.flatMap((line) => {
    const match = findCartVariant(line.variantId, catalogProducts);
    const stored = serverCart?.items.find((item) => item.sku === line.variantId);
    if (stored) return [{
      variantId: line.variantId,
      quantity: stored.quantity,
      name: stored.name,
      slug: stored.slug,
      color: stored.color,
      size: stored.size,
      stock: stored.availableStock,
      unitPriceMinor: stored.unitPriceMinor,
      image: stored.imageUrl ?? (match ? getProductImage(match.product, stored.color).src : null),
      imageAlt: `${stored.name}, цвет ${stored.color}`,
    }];
    return match ? [{
      variantId: line.variantId,
      quantity: line.quantity,
      name: match.product.name,
      slug: match.product.slug,
      color: match.variant.color,
      size: match.variant.size,
      stock: match.variant.stock,
      unitPriceMinor: match.variant.priceMinor ?? match.product.price,
      image: getProductImage(match.product, match.variant.color).src,
      imageAlt: getProductImage(match.product, match.variant.color).alt,
    }] : [];
  });
  const total = serverCart?.totalMinor ?? resolvedLines.reduce((sum, line) => sum + line.unitPriceMinor * line.quantity, 0);
  const recommendations = catalogProducts.filter(
    (product) => !resolvedLines.some((line) => line.slug === product.slug),
  ).slice(0, 2);

  return (
    <dialog
      aria-label="Корзина"
      className={styles.drawer}
      onCancel={(event) => { event.preventDefault(); closeCart(); }}
      onClose={closeCart}
      onClick={(event) => {
        if (event.target === dialogRef.current) closeCart();
      }}
      ref={dialogRef}
    >
      <div className={styles.panel}>
        <div className={styles.heading}>
          <div>
            <span>ВАШ ВЫБОР</span>
            <h2>Корзина <small>({resolvedLines.length})</small></h2>
          </div>
          <button aria-label="Закрыть корзину" className={styles.close} onClick={closeCart} type="button">
            ×
          </button>
        </div>

        {syncing ? <p className={styles.notice} role="status">Синхронизируем корзину…</p> : null}
        {error ? <p className={styles.notice} role="alert">{error}</p> : null}
        {resolvedLines.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyMark}>↗</span>
            <p>Пока пусто.<br />Но это ненадолго.</p>
            <span>Твой следующий любимый образ уже в каталоге.</span>
            <Link href="/catalog" onClick={closeCart}>Смотреть коллекцию <span aria-hidden="true">↗</span></Link>
          </div>
        ) : (
          <>
            <div className={styles.items}>
              {resolvedLines.map(({ variantId, quantity, name, slug, color, size, stock, unitPriceMinor, image, imageAlt }) => (
                <article className={styles.item} key={variantId}>
                  <div className={styles.photo}>
                    {image ? <Image alt={imageAlt} fill sizes="96px" src={image} /> : <span aria-hidden="true">AQVERINE</span>}
                  </div>
                  <div className={styles.itemDetails}>
                    <Link href={`/products/${slug}?color=${encodeURIComponent(color)}`} onClick={closeCart}>{name}</Link>
                    <span>{color} / {size}</span>
                    <strong>{formatPrice(unitPriceMinor * quantity)}</strong>
                    <div className={styles.quantity} aria-label={`Количество: ${quantity}`}>
                      <button aria-label={`Уменьшить количество ${name}`} onClick={() => { void setQuantity(variantId, quantity - 1); }} type="button">−</button>
                      <span>{quantity}</span>
                      <button aria-label={`Увеличить количество ${name}`} disabled={quantity >= stock} onClick={() => { void setQuantity(variantId, quantity + 1); }} type="button">+</button>
                    </div>
                  </div>
                  <button aria-label={`Удалить ${name}`} className={styles.remove} onClick={() => { void setQuantity(variantId, 0); }} type="button">×</button>
                </article>
              ))}
            </div>
            {recommendations.length > 0 ? (
              <div className={styles.recommendations}>
                <div className={styles.recommendHeading}><strong>ДОПОЛНИ ОБРАЗ</strong><span>↗</span></div>
                <div className={styles.recommendGrid}>
                  {recommendations.map((product) => (
                    <Link href={`/products/${product.slug}`} key={product.id} onClick={closeCart}>
                      <span className={styles.recommendPhoto}><Image alt={product.imageAlt} fill sizes="(max-width: 540px) 46vw, 240px" src={product.image} /></span>
                      <span>{product.name}<small>{formatPrice(product.price)}</small></span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            <div className={styles.summary}>
              <div><span>Итого</span><strong>{formatPrice(total)}</strong></div>
              <p>{serverCart ? "Корзина синхронизирована. Цены и остатки будут повторно проверены при оформлении." : "Корзина сохранена в этом браузере. Можно посмотреть демо-оформление; заказ и оплата пока недоступны."}</p>
              <Link className={styles.checkoutLink} href="/checkout" onClick={closeCart}>{serverCart ? "Оформить заказ" : "Посмотреть оформление"} <span aria-hidden="true">↗</span></Link>
              <Link href="/catalog" onClick={closeCart}>Продолжить покупки</Link>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
