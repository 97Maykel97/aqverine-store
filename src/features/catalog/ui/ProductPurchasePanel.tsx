"use client";

import { useState } from "react";

import { useCart } from "@/features/cart/ui/CartProvider";
import { formatPrice } from "@/features/catalog/model/mock-products";
import type { CatalogProduct } from "@/shared/types/catalog";

import styles from "./ProductPurchasePanel.module.scss";

const colorValues: Record<string, string> = {
  "Белый": "#f7f5ee",
  "Чёрный": "#1d1d1d",
  "Графит": "#575959",
  "Бежевый": "#c6b49a",
  "Голубой": "#9bb9db",
  "Молочный": "#e9dfce",
  "Песочный": "#c9ad86",
  "Натуральный": "#d8c6a5",
};

export function ProductPurchasePanel({ product }: { product: CatalogProduct }) {
  const { addItem } = useCart();
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const sizes = [...new Set(product.variants.filter((variant) => variant.color === color).map((variant) => variant.size))];
  const selectedVariant = product.variants.find((variant) => variant.color === color && variant.size === size);

  const handleAdd = () => {
    if (!selectedVariant) return;
    setMessage(addItem(selectedVariant.id, quantity) ? "Добавлено в корзину" : "Доступное количество уже в корзине");
  };

  return (
    <div className={styles.panel}>
      <span className={styles.label}>AQVERINE / {product.category.toUpperCase()}</span>
      <h1>{product.name}</h1>
      <p className={styles.price}>{formatPrice(product.price)}</p>
      <p className={styles.description}>{product.description}</p>

      <div className={styles.option}>
        <div className={styles.optionHeading}><strong>ЦВЕТ</strong><span>{color ?? "Выберите цвет"}</span></div>
        <div className={styles.colors} role="group" aria-label="Цвет">
          {product.colors.map((item) => (
            <button
              aria-label={item}
              aria-pressed={color === item}
              className={color === item ? styles.selectedColor : undefined}
              key={item}
              onClick={() => { setColor(item); setSize(null); setQuantity(1); setMessage(""); }}
              style={{ "--swatch-color": colorValues[item] ?? "#888" } as React.CSSProperties}
              type="button"
            ><span /></button>
          ))}
        </div>
        <small>Фото показывает основной цвет модели.</small>
      </div>

      <div className={styles.option}>
        <div className={styles.optionHeading}><strong>РАЗМЕР</strong><span>{size ?? "Выберите размер"}</span></div>
        <div className={styles.sizes} role="group" aria-label="Размер">
          {(color ? sizes : [...new Set(product.variants.map((variant) => variant.size))]).map((item) => {
            const variant = product.variants.find((entry) => entry.color === color && entry.size === item);
            return (
              <button
                aria-pressed={size === item}
                disabled={!color || !variant || variant.stock === 0}
                key={item}
                onClick={() => { setSize(item); setQuantity(1); setMessage(""); }}
                type="button"
              >{item}</button>
            );
          })}
        </div>
      </div>

      <div className={styles.purchase}>
        <div className={styles.quantity} aria-label={`Количество: ${quantity}`}>
          <button aria-label="Уменьшить количество" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)} type="button">−</button>
          <span>{quantity}</span>
          <button aria-label="Увеличить количество" disabled={!selectedVariant || quantity >= selectedVariant.stock} onClick={() => setQuantity(quantity + 1)} type="button">+</button>
        </div>
        <button className={styles.addButton} disabled={!selectedVariant} onClick={handleAdd} type="button">
          {selectedVariant ? "Добавить в корзину" : "Выберите цвет и размер"}<span aria-hidden="true">↗</span>
        </button>
      </div>
      <p className={styles.feedback} role="status">{message || (selectedVariant ? `В наличии: ${selectedVariant.stock} шт.` : "Выберите вариант, чтобы добавить товар")}</p>
      <div className={styles.extra}>
        <div><span>СОСТАВ</span><strong>{product.composition}</strong></div>
        <div><span>УХОД</span><strong>Бережная стирка при 30°C</strong></div>
      </div>
    </div>
  );
}
