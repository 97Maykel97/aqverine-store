import { OrderStatus, Prisma, ProductStatus } from "@/generated/prisma/client";

import type { AdminProductCreateInput, AdminProductUpdateInput, AdminVariantCreateInput, AdminVariantUpdateInput } from "@/features/admin/model/admin-input";
import { cleanupProductStorageImages, isProductStorageAvailable } from "@/features/admin/api/admin-storage";
import { getPrisma } from "@/shared/lib/prisma";

export class AdminDomainError extends Error {
  constructor(readonly code: "NOT_FOUND" | "PUBLISH_REQUIREMENTS" | "INVALID_TRANSITION" | "DELETE_REQUIRES_DRAFT" | "PRODUCT_IN_USE" | "STORAGE_UNAVAILABLE") {
    super(code);
  }
}

const productSelect = {
  id: true, slug: true, name: true, description: true, category: true, composition: true,
  careInstructions: true, priceMinor: true, currency: true, status: true, createdAt: true,
  variants: { orderBy: [{ color: "asc" }, { size: "asc" }], select: {
    id: true, sku: true, color: true, size: true, stock: true, priceMinor: true, isActive: true,
  } },
  images: { orderBy: [{ sortOrder: "asc" }], select: {
    id: true, color: true, localPath: true, storageKey: true, altText: true, sortOrder: true,
  } },
} satisfies Prisma.ProductSelect;

export async function listAdminProducts(page: number, limit: number) {
  const prisma = getPrisma();
  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit, select: productSelect }),
    prisma.product.count(),
  ]);
  return { items, page, limit, total };
}

export async function createAdminProduct(input: AdminProductCreateInput) {
  return getPrisma().product.create({
    data: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      category: input.category,
      composition: input.composition ?? null,
      careInstructions: input.careInstructions ?? null,
      priceMinor: input.priceMinor,
      currency: "USD",
      status: ProductStatus.DRAFT,
      variants: { create: input.variants.map((variant) => ({
        sku: variant.sku, color: variant.color, size: variant.size,
        stock: variant.stock, priceMinor: variant.priceMinor ?? null,
      })) },
    },
    select: productSelect,
  });
}

export async function updateAdminProduct(productId: string, input: AdminProductUpdateInput) {
  return getPrisma().$transaction(async (transaction) => {
    const current = await transaction.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        variants: { where: { isActive: true }, select: { id: true } },
        images: { select: { id: true } },
      },
    });
    if (!current) throw new AdminDomainError("NOT_FOUND");
    if (input.status === ProductStatus.PUBLISHED && (!current.variants.length || !current.images.length)) {
      throw new AdminDomainError("PUBLISH_REQUIREMENTS");
    }
    return transaction.product.update({
      where: { id: productId },
      data: {
        ...input,
        ...(input.status === ProductStatus.ARCHIVED ? { archivedAt: new Date() } :
          input.status === ProductStatus.PUBLISHED || input.status === ProductStatus.DRAFT ? { archivedAt: null } : {}),
      },
      select: productSelect,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function deleteAdminProduct(productId: string) {
  const storageKeys = await getPrisma().$transaction(async (transaction) => {
    const product = await transaction.product.findUnique({ where: { id: productId }, select: { status: true } });
    if (!product) throw new AdminDomainError("NOT_FOUND");
    if (product.status !== ProductStatus.DRAFT) throw new AdminDomainError("DELETE_REQUIRES_DRAFT");

    // Lock the product and its variants before checking references, so concurrent cart and order writes wait.
    const locked = await transaction.product.updateMany({
      where: { id: productId, status: ProductStatus.DRAFT }, data: { updatedAt: new Date() },
    });
    if (!locked.count) throw new AdminDomainError("DELETE_REQUIRES_DRAFT");
    await transaction.productVariant.updateMany({ where: { productId }, data: { updatedAt: new Date() } });

    const [orderItems, cartItems, images] = await Promise.all([
      transaction.orderItem.count({ where: { OR: [{ productId }, { variant: { productId } }] } }),
      transaction.cartItem.count({ where: { variant: { productId } } }),
      transaction.productImage.findMany({ where: { productId }, select: { storageKey: true } }),
    ]);
    if (orderItems || cartItems) throw new AdminDomainError("PRODUCT_IN_USE");
    const keys = images.flatMap((image) => image.storageKey ? [image.storageKey] : []);
    if (keys.length && !isProductStorageAvailable()) throw new AdminDomainError("STORAGE_UNAVAILABLE");

    await transaction.productVariant.deleteMany({ where: { productId } });
    await transaction.product.delete({ where: { id: productId } });
    return keys;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await cleanupProductStorageImages(storageKeys);
  return { deleted: true };
}

export async function createAdminVariant(productId: string, input: AdminVariantCreateInput) {
  const product = await getPrisma().product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new AdminDomainError("NOT_FOUND");
  return getPrisma().productVariant.create({
    data: { productId, sku: input.sku, color: input.color, size: input.size, stock: input.stock, priceMinor: input.priceMinor ?? null },
    select: { id: true, sku: true, color: true, size: true, stock: true, priceMinor: true, isActive: true },
  });
}

export async function updateAdminVariant(variantId: string, input: AdminVariantUpdateInput) {
  return getPrisma().$transaction(async (transaction) => {
    const variant = await transaction.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, isActive: true, productId: true, product: { select: { status: true } } },
    });
    if (!variant) throw new AdminDomainError("NOT_FOUND");
    if (input.isActive === false && variant.isActive && variant.product.status === ProductStatus.PUBLISHED) {
      const otherActiveVariants = await transaction.productVariant.count({
        where: { productId: variant.productId, id: { not: variantId }, isActive: true },
      });
      if (otherActiveVariants === 0) throw new AdminDomainError("PUBLISH_REQUIREMENTS");
    }
    return transaction.productVariant.update({
      where: { id: variantId },
      data: input,
      select: { id: true, sku: true, color: true, size: true, stock: true, priceMinor: true, isActive: true },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function listAdminOrders(page: number, limit: number) {
  const prisma = getPrisma();
  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * limit, take: limit,
      select: {
        id: true, number: true, status: true, totalMinor: true, currency: true, createdAt: true,
        contactName: true, contactEmail: true, contactPhone: true,
        items: { select: { productName: true, color: true, size: true, quantity: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
      },
    }),
    prisma.order.count(),
  ]);
  return { items, page, limit, total };
}

export async function advanceAdminOrder(orderId: string, next: "PROCESSING" | "COMPLETED") {
  const expected = next === OrderStatus.PROCESSING ? OrderStatus.PAID : OrderStatus.PROCESSING;
  const result = await getPrisma().order.updateMany({ where: { id: orderId, status: expected }, data: { status: next } });
  if (!result.count) throw new AdminDomainError("INVALID_TRANSITION");
  return { id: orderId, status: next };
}
