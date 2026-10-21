export type ProductCategory =
  | "T-shirts"
  | "Hoodies"
  | "Shirts"
  | "Trousers"
  | "Outerwear"
  | "Accessories";

export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  category: ProductCategory;
  price: number;
  colors: readonly string[];
  image: string;
  imageAlt: string;
  imagesByColor: Readonly<Record<string, string>>;
  description: string;
  composition: string;
  variants: readonly CatalogVariant[];
}

export interface CatalogVariant {
  id: string;
  color: string;
  size: string;
  stock: number;
}
