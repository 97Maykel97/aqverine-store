import type { CatalogProduct } from "@/shared/types/catalog";

export const mockProducts: readonly CatalogProduct[] = [
  {
    id: "essential-t-shirt",
    name: "Футболка Essential",
    slug: "essential-t-shirt",
    category: "T-shirts",
    price: 249000,
    colors: ["Белый", "Чёрный", "Графит"],
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Белая базовая футболка на модели",
  },
  {
    id: "everyday-hoodie",
    name: "Худи Everyday",
    slug: "everyday-hoodie",
    category: "Hoodies",
    price: 599000,
    colors: ["Бежевый", "Чёрный"],
    image:
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Тёмное худи на модели",
  },
  {
    id: "oversize-shirt",
    name: "Рубашка Oversize",
    slug: "oversize-shirt",
    category: "Shirts",
    price: 479000,
    colors: ["Молочный", "Голубой"],
    image:
      "https://images.unsplash.com/photo-1605763240000-7e93b172d754?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Свободная светлая рубашка",
  },
  {
    id: "relaxed-trousers",
    name: "Брюки Relaxed",
    slug: "relaxed-trousers",
    category: "Trousers",
    price: 549000,
    colors: ["Чёрный", "Песочный"],
    image:
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Чёрные брюки свободного кроя",
  },
  {
    id: "core-denim-jacket",
    name: "Джинсовая куртка Core",
    slug: "core-denim-jacket",
    category: "Outerwear",
    price: 799000,
    colors: ["Голубой"],
    image:
      "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Джинсовая куртка голубого цвета",
  },
  {
    id: "canvas-tote",
    name: "Шопер Canvas",
    slug: "canvas-tote",
    category: "Accessories",
    price: 129000,
    colors: ["Натуральный", "Чёрный"],
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85",
    imageAlt: "Светлый холщовый шопер",
  },
];

export const formatPrice = (amount: number): string =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount / 100);
