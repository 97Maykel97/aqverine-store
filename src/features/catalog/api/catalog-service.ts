import { ProductStatus, type Prisma } from "@/generated/prisma/client";
import type { CatalogQuery } from "@/features/catalog/model/catalog-query";
import { getPrisma } from "@/shared/lib/prisma";

const productSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  category: true,
  composition: true,
  careInstructions: true,
  priceMinor: true,
  currency: true,
  variants: {
    where: { isActive: true },
    orderBy: [{ color: "asc" }, { size: "asc" }],
    select: {
      id: true, sku: true, color: true, size: true, stock: true, priceMinor: true,
    },
  },
  images: {
    orderBy: [{ sortOrder: "asc" }],
    select: { color: true, localPath: true, altText: true, sortOrder: true },
  },
} satisfies Prisma.ProductSelect;

type SelectedProduct = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function toPublicProduct(product: SelectedProduct) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    composition: product.composition,
    careInstructions: product.careInstructions,
    priceMinor: product.priceMinor,
    currency: product.currency,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      color: variant.color,
      size: variant.size,
      stock: variant.stock,
      priceMinor: variant.priceMinor ?? product.priceMinor,
    })),
    images: product.images.map((image) => ({
      color: image.color,
      url: image.localPath,
      alt: image.altText,
      sortOrder: image.sortOrder,
    })),
  };
}

export async function listPublishedProducts(query: CatalogQuery) {
  const prisma = getPrisma();
  const variantFilter = query.color || query.size ? {
    isActive: true,
    stock: { gt: 0 },
    ...(query.color ? { color: query.color } : {}),
    ...(query.size ? { size: query.size } : {}),
  } : undefined;
  const where: Prisma.ProductWhereInput = {
    status: ProductStatus.PUBLISHED,
    archivedAt: null,
    ...(query.category ? { category: query.category } : {}),
    ...(query.q ? { OR: [
      { name: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ] } : {}),
    ...(variantFilter ? { variants: { some: variantFilter } } : {}),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = query.sort === "price-asc"
    ? [{ priceMinor: "asc" }, { id: "asc" }]
    : query.sort === "price-desc"
      ? [{ priceMinor: "desc" }, { id: "asc" }]
      : query.sort === "name"
        ? [{ name: "asc" }, { id: "asc" }]
        : [{ createdAt: "desc" }, { id: "asc" }];

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where, orderBy, select: productSelect,
      skip: (query.page - 1) * query.limit, take: query.limit,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items.map(toPublicProduct),
    pagination: { page: query.page, limit: query.limit, total },
  };
}

export async function findPublishedProduct(slug: string) {
  const product = await getPrisma().product.findFirst({
    where: { slug, status: ProductStatus.PUBLISHED, archivedAt: null },
    select: productSelect,
  });
  return product ? toPublicProduct(product) : null;
}
