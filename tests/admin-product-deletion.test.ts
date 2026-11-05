import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteAdminProduct } from "@/features/admin/api/admin-service";

const database = vi.hoisted(() => ({
  productFindUnique: vi.fn(), productUpdateMany: vi.fn(), variantUpdateMany: vi.fn(),
  orderItemCount: vi.fn(), cartItemCount: vi.fn(), imageFindMany: vi.fn(),
  variantDeleteMany: vi.fn(), productDelete: vi.fn(), transaction: vi.fn(),
  storageAvailable: vi.fn(), storageCleanup: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({ $transaction: database.transaction }),
}));
vi.mock("@/features/admin/api/admin-storage", () => ({
  isProductStorageAvailable: database.storageAvailable,
  cleanupProductStorageImages: database.storageCleanup,
}));

beforeEach(() => {
  vi.clearAllMocks();
  database.productFindUnique.mockResolvedValue({ status: "DRAFT" });
  database.productUpdateMany.mockResolvedValue({ count: 1 });
  database.variantUpdateMany.mockResolvedValue({ count: 1 });
  database.orderItemCount.mockResolvedValue(0);
  database.cartItemCount.mockResolvedValue(0);
  database.imageFindMany.mockResolvedValue([]);
  database.storageAvailable.mockReturnValue(true);
  database.transaction.mockImplementation(async (run: (transaction: unknown) => Promise<unknown>) => run({
    product: { findUnique: database.productFindUnique, updateMany: database.productUpdateMany, delete: database.productDelete },
    productVariant: { updateMany: database.variantUpdateMany, deleteMany: database.variantDeleteMany },
    orderItem: { count: database.orderItemCount },
    cartItem: { count: database.cartItemCount },
    productImage: { findMany: database.imageFindMany },
  }));
});

describe("admin product deletion", () => {
  it("deletes an unused draft and cleans up its stored images", async () => {
    database.imageFindMany.mockResolvedValue([{ storageKey: null }, { storageKey: "draft/image.webp" }]);

    await expect(deleteAdminProduct("product-id")).resolves.toEqual({ deleted: true });
    expect(database.productUpdateMany).toHaveBeenCalledWith({
      where: { id: "product-id", status: "DRAFT" }, data: { updatedAt: expect.any(Date) },
    });
    expect(database.variantDeleteMany).toHaveBeenCalledWith({ where: { productId: "product-id" } });
    expect(database.productDelete).toHaveBeenCalledWith({ where: { id: "product-id" } });
    expect(database.storageCleanup).toHaveBeenCalledWith(["draft/image.webp"]);
  });

  it("keeps published products and their order history", async () => {
    database.productFindUnique.mockResolvedValue({ status: "PUBLISHED" });

    await expect(deleteAdminProduct("product-id")).rejects.toMatchObject({ code: "DELETE_REQUIRES_DRAFT" });
    expect(database.variantDeleteMany).not.toHaveBeenCalled();
    expect(database.storageCleanup).not.toHaveBeenCalled();
  });

  it("keeps drafts referenced by a cart or an order", async () => {
    database.cartItemCount.mockResolvedValue(1);

    await expect(deleteAdminProduct("product-id")).rejects.toMatchObject({ code: "PRODUCT_IN_USE" });
    expect(database.variantDeleteMany).not.toHaveBeenCalled();
    expect(database.productDelete).not.toHaveBeenCalled();
  });

  it("does not delete database records when image storage is unavailable", async () => {
    database.imageFindMany.mockResolvedValue([{ storageKey: "draft/image.webp" }]);
    database.storageAvailable.mockReturnValue(false);

    await expect(deleteAdminProduct("product-id")).rejects.toMatchObject({ code: "STORAGE_UNAVAILABLE" });
    expect(database.variantDeleteMany).not.toHaveBeenCalled();
  });
});
