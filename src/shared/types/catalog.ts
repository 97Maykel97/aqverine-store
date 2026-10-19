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
}
