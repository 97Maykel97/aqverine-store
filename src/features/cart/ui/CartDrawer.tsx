"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { findCartVariant } from "@/features/cart/model/guest-cart";
import { useCart } from "@/features/cart/ui/CartProvider";
import { formatPrice, getProductImage, mockProducts } from "@/features/catalog/model/mock-products";

import styles from "./CartDrawer.module.scss";

export function CartDrawer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { lines, isOpen, closeCart, setQuantity } = useCart();

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
    const match = findCartVariant(line.variantId);
    return match ? [{ ...line, ...match }] : [];
  });
  const total = resolvedLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const recommendations = mockProducts.filter(
    (product) => !resolvedLines.some((line) => line.product.id === product.id),
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
              {resolvedLines.map(({ variantId, quantity, product, variant }) => (
                <article className={styles.item} key={variantId}>
                  <div className={styles.photo}>
                    <Image alt={getProductImage(product, variant.color).alt} fill sizes="96px" src={getProductImage(product, variant.color).src} />
                  </div>
                  <div className={styles.itemDetails}>
                    <Link href={`/products/${product.slug}?color=${encodeURIComponent(variant.color)}`} onClick={closeCart}>{product.name}</Link>
                    <span>{variant.color} / {variant.size}</span>
                    <strong>{formatPrice(product.price * quantity)}</strong>
                    <div className={styles.quantity} aria-label={`Количество: ${quantity}`}>
                      <button aria-label={`Уменьшить количество ${product.name}`} onClick={() => setQuantity(variantId, quantity - 1)} type="button">−</button>
                      <span>{quantity}</span>
                      <button aria-label={`Увеличить количество ${product.name}`} disabled={quantity >= variant.stock} onClick={() => setQuantity(variantId, quantity + 1)} type="button">+</button>
                    </div>
                  </div>
                  <button aria-label={`Удалить ${product.name}`} className={styles.remove} onClick={() => setQuantity(variantId, 0)} type="button">×</button>
                </article>
              ))}
            </div>
            {recommendations.length > 0 ? (
              <div className={styles.recommendations}>
                <div className={styles.recommendHeading}><strong>ДОПОЛНИ ОБРАЗ</strong><span>↗</span></div>
                <div className={styles.recommendGrid}>
                  {recommendations.map((product) => (
                    <Link href={`/products/${product.slug}`} key={product.id} onClick={closeCart}>
                      <span className={styles.recommendPhoto}><Image alt={product.imageAlt} fill sizes="(max-width: 520px) 120px, 180px" src={product.image} /></span>
                      <span>{product.name}<small>{formatPrice(product.price)}</small></span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
            <div className={styles.summary}>
              <div><span>Итого</span><strong>{formatPrice(total)}</strong></div>
              <p>Корзина сохранена в этом браузере. Онлайн-оплата пока недоступна.</p>
              <button disabled type="button">Оформление скоро откроется</button>
              <Link href="/catalog" onClick={closeCart}>Продолжить покупки</Link>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
