import type { CatalogProduct, CatalogVariant, ProductCategory } from "@/shared/types/catalog";

const createVariants = (
  slug: string,
  colors: readonly string[],
  sizes: readonly string[],
): readonly CatalogVariant[] =>
  colors.flatMap((color, colorIndex) =>
    sizes.map((size) => ({ id: `${slug}-${colorIndex}-${size}`, color, size, stock: 8 })),
  );

export const categories: ReadonlyArray<{ label: string; value: ProductCategory | "All" }> = [
  { label: "Все", value: "All" },
  { label: "Футболки", value: "T-shirts" },
  { label: "Худи", value: "Hoodies" },
  { label: "Рубашки", value: "Shirts" },
  { label: "Брюки", value: "Trousers" },
  { label: "Верхняя одежда", value: "Outerwear" },
  { label: "Аксессуары", value: "Accessories" },
];

export const mockProducts: readonly CatalogProduct[] = [
  {
    id: "essential-t-shirt",
    name: "Футболка Essential",
    slug: "essential-t-shirt",
    category: "T-shirts",
    price: 249000,
    colors: ["Белый", "Чёрный", "Графит"],
    image: "/images/products/essential-t-shirt.png",
    imageAlt: "Модель в белой футболке Essential и чёрных брюках",
    description: "Чистая форма на каждый день. Свободная посадка и плотный хлопок, который держит силуэт.",
    composition: "100% хлопок",
    variants: createVariants("essential-t-shirt", ["Белый", "Чёрный", "Графит"], ["S", "M", "L", "XL"]),
  },
  {
    id: "everyday-hoodie",
    name: "Худи Everyday",
    slug: "everyday-hoodie",
    category: "Hoodies",
    price: 599000,
    colors: ["Чёрный", "Бежевый"],
    image: "/images/products/everyday-hoodie.png",
    imageAlt: "Модель в тёмном худи Everyday",
    description: "Мягкое худи свободного кроя для маршрутов без расписания.",
    composition: "80% хлопок, 20% полиэстер",
    variants: createVariants("everyday-hoodie", ["Чёрный", "Бежевый"], ["S", "M", "L", "XL"]),
  },
  {
    id: "oversize-shirt",
    name: "Рубашка Oversize",
    slug: "oversize-shirt",
    category: "Shirts",
    price: 479000,
    colors: ["Голубой", "Молочный"],
    image: "/images/products/oversize-shirt.png",
    imageAlt: "Модель в голубой рубашке свободного кроя",
    description: "Лёгкая рубашка с выразительным объёмом. Работает самостоятельно и поверх базового слоя.",
    composition: "100% хлопок",
    variants: createVariants("oversize-shirt", ["Голубой", "Молочный"], ["S", "M", "L"]),
  },
  {
    id: "relaxed-trousers",
    name: "Брюки Relaxed",
    slug: "relaxed-trousers",
    category: "Trousers",
    price: 549000,
    colors: ["Чёрный", "Песочный"],
    image: "/images/products/relaxed-trousers.png",
    imageAlt: "Чёрные брюки Relaxed свободного кроя",
    description: "Широкая посадка и выверенные линии: комфорт на весь день без компромисса в силуэте.",
    composition: "65% вискоза, 35% полиэстер",
    variants: createVariants("relaxed-trousers", ["Чёрный", "Песочный"], ["S", "M", "L", "XL"]),
  },
  {
    id: "core-denim-jacket",
    name: "Джинсовая куртка Core",
    slug: "core-denim-jacket",
    category: "Outerwear",
    price: 799000,
    colors: ["Голубой"],
    image: "/images/products/core-denim-jacket.png",
    imageAlt: "Модель в голубой джинсовой куртке Core",
    description: "Деним в правильной пропорции: расслабленный крой и уверенная фактура.",
    composition: "100% хлопок",
    variants: createVariants("core-denim-jacket", ["Голубой"], ["S", "M", "L", "XL"]),
  },
  {
    id: "canvas-tote",
    name: "Шопер Canvas",
    slug: "canvas-tote",
    category: "Accessories",
    price: 129000,
    colors: ["Натуральный", "Чёрный"],
    image: "/images/products/canvas-tote.png",
    imageAlt: "Шопер Canvas из светлого плотного холста",
    description: "Вместительная сумка из плотного холста для всего, что нужно в городе.",
    composition: "100% хлопок",
    variants: createVariants("canvas-tote", ["Натуральный", "Чёрный"], ["ONE SIZE"]),
  },
];

export const getProductBySlug = (slug: string): CatalogProduct | undefined =>
  mockProducts.find((product) => product.slug === slug);

export const formatPrice = (amount: number): string =>
  new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount / 100);
