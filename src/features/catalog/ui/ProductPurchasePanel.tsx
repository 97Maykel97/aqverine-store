"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { useCart } from "@/features/cart/ui/CartProvider";
import { formatPrice, getProductImage } from "@/features/catalog/model/mock-products";
import { productColorValues } from "@/features/catalog/model/product-colors";
import type { CatalogProduct } from "@/shared/types/catalog";

import styles from "./ProductPurchasePanel.module.scss";

interface ProductPurchasePanelProps {
  product: CatalogProduct;
}

export function ProductPurchasePanel({ product }: ProductPurchasePanelProps) {
  const requestedColor = useSearchParams().get("color");
  const initialColor = requestedColor && product.colors.includes(requestedColor) ? requestedColor : product.colors[0];
  return <ProductExperience initialColor={initialColor} key={initialColor} product={product} />;
}

function ProductExperience({ product, initialColor }: ProductPurchasePanelProps & { initialColor: string }) {
  const { addItem, openCart } = useCart();
  const [color, setColor] = useState(initialColor);
  const [size, setSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState("");
  const image = getProductImage(product, color);
  const sizes = [...new Set(product.variants.filter((variant) => variant.color === color).map((variant) => variant.size))];
  const selectedVariant = product.variants.find((variant) => variant.color === color && variant.size === size);

  const selectColor = (nextColor: string) => {
    setColor(nextColor);
    setSize(null);
    setQuantity(1);
    setMessage("");
  };

  const handleAdd = () => {
    if (!selectedVariant) return;
    if (addItem(selectedVariant.id, quantity)) {
      setMessage(`${product.name}, ${color} / ${size} — добавлено в корзину`);
      openCart();
    } else {
      setMessage("Недостаточно товара в наличии. Уменьшите количество в корзине.");
    }
  };

  return (
    <section className={styles.product}>
      <div className={styles.gallery}>
        <div className={styles.mainPhoto}>
          <Image
            alt={image.alt}
            className={styles.mainImage}
            fill
            key={image.src}
            loading="eager"
            sizes="(max-width: 820px) 100vw, (max-width: 1600px) 48vw, 740px"
            src={image.src}
          />
          <span className={styles.photoIndex}>AQVERINE / {String(product.colors.indexOf(color) + 1).padStart(2, "0")}</span>
        </div>
        <div aria-label="Фотографии цветов" className={styles.thumbnails} role="group">
          {product.colors.map((item) => {
            const thumbnail = getProductImage(product, item);
            return (
              <button
                aria-label={`Показать цвет ${item}`}
                aria-pressed={color === item}
                className={color === item ? styles.activeThumbnail : undefined}
                key={item}
                onClick={() => selectColor(item)}
                type="button"
              >
                <Image alt="" fill sizes="76px" src={thumbnail.src} />
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.panel}>
        <span className={styles.label}>AQVERINE / {product.category.toUpperCase()}</span>
        <h1>{product.name}</h1>
        <p className={styles.price}>{formatPrice(product.price)}</p>
        <p className={styles.description}>{product.description}</p>

        <div className={styles.option}>
          <div className={styles.optionHeading}><strong>ЦВЕТ</strong><span>{color}</span></div>
          <div className={styles.colors} role="group" aria-label="Цвет товара">
            {product.colors.map((item) => (
              <button
                aria-label={item}
                aria-pressed={color === item}
                className={color === item ? styles.selectedColor : undefined}
                key={item}
                onClick={() => selectColor(item)}
                style={{ "--swatch-color": productColorValues[item] ?? "#888" } as React.CSSProperties}
                type="button"
              ><span /></button>
            ))}
          </div>
          <small>На фото — выбранный цвет.</small>
        </div>

        <div className={styles.option}>
          <div className={styles.optionHeading}><strong>РАЗМЕР</strong><span>{size ?? "Выберите размер"}</span></div>
          <div className={styles.sizes} role="group" aria-label="Размер товара">
            {sizes.map((item) => {
              const variant = product.variants.find((entry) => entry.color === color && entry.size === item);
              return (
                <button
                  aria-pressed={size === item}
                  disabled={!variant || variant.stock === 0}
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
            <span>{selectedVariant ? "Добавить в корзину" : "Выберите размер"}</span><span aria-hidden="true">↗</span>
          </button>
        </div>
        <p className={styles.feedback} role="status">{message || (selectedVariant ? `В наличии: ${selectedVariant.stock} шт.` : "Выберите размер, чтобы добавить товар")}</p>
        <div className={styles.extra}>
          <div><span>СОСТАВ</span><strong>{product.composition}</strong></div>
          <div><span>УХОД</span><strong>Бережная стирка при 30°C</strong></div>
        </div>
      </div>
    </section>
  );
}
