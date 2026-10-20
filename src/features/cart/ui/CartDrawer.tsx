"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { findCartVariant } from "@/features/cart/model/guest-cart";
import { useCart } from "@/features/cart/ui/CartProvider";
import { formatPrice } from "@/features/catalog/model/mock-products";

import styles from "./CartDrawer.module.scss";

export function CartDrawer() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { lines, isOpen, closeCart, setQuantity } = useCart();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const resolvedLines = lines.flatMap((line) => {
    const match = findCartVariant(line.variantId);
    return match ? [{ ...line, ...match }] : [];
  });
  const total = resolvedLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  return (
    <dialog
      aria-label="Корзина"
      className={styles.drawer}
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
            <h2>Корзина <small>({lines.length})</small></h2>
          </div>
          <button aria-label="Закрыть корзину" className={styles.close} onClick={closeCart} type="button">
            ×
          </button>
        </div>

        {resolvedLines.length === 0 ? (
          <div className={styles.empty}>
            <p>Здесь пока ничего нет.</p>
            <span>Найдите вещь, которая станет вашей.</span>
            <Link href="/catalog" onClick={closeCart}>Перейти в каталог →</Link>
          </div>
        ) : (
          <>
            <div className={styles.items}>
              {resolvedLines.map(({ variantId, quantity, product, variant }) => (
                <article className={styles.item} key={variantId}>
                  <div className={styles.photo}>
                    <Image alt={product.imageAlt} fill sizes="90px" src={product.image} />
                  </div>
                  <div className={styles.itemDetails}>
                    <Link href={`/products/${product.slug}`} onClick={closeCart}>{product.name}</Link>
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
            <div className={styles.summary}>
              <div><span>Итого</span><strong>{formatPrice(total)}</strong></div>
              <p>Оформление заказа станет доступно после подключения оплаты.</p>
              <button disabled type="button">Перейти к оформлению</button>
              <Link href="/catalog" onClick={closeCart}>Продолжить покупки</Link>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
