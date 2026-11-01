import { beforeEach, describe, expect, it, vi } from "vitest";

import { advanceAdminOrder, updateAdminProduct } from "@/features/admin/api/admin-service";
import { adminProductCreateSchema } from "@/features/admin/model/admin-input";

const database = vi.hoisted(() => ({
  orderUpdateMany: vi.fn(),
  productFindUnique: vi.fn(),
  productUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    order: { updateMany: database.orderUpdateMany },
    $transaction: database.transaction,
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  database.transaction.mockImplementation(async (run: (transaction: unknown) => Promise<unknown>) => run({
    product: { findUnique: database.productFindUnique, update: database.productUpdate },
  }));
});

describe("admin commerce boundaries", () => {
  it("rejects invalid money and duplicate color-size variants", () => {
    const base = {
      slug: "city-shirt", name: "City shirt", description: "A city-ready shirt",
      category: "Shirts", priceMinor: 2900,
      variants: [{ sku: "shirt-black-m", color: "Black", size: "M", stock: 4 }],
    };
    expect(adminProductCreateSchema.safeParse({ ...base, priceMinor: -100 }).success).toBe(false);
    expect(adminProductCreateSchema.safeParse({ ...base, variants: [base.variants[0], { ...base.variants[0], sku: "another-sku" }] }).success).toBe(false);
  });

  it("does not publish a product without an image and active variant", async () => {
    database.productFindUnique.mockResolvedValue({ id: "product-id", variants: [{ id: "variant-id" }], images: [] });

    await expect(updateAdminProduct("product-id", { status: "PUBLISHED" })).rejects.toMatchObject({ code: "PUBLISH_REQUIREMENTS" });
    expect(database.productUpdate).not.toHaveBeenCalled();
  });

  it("only advances a paid order to processing", async () => {
    database.orderUpdateMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 1 });

    await expect(advanceAdminOrder("order-id", "PROCESSING")).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await expect(advanceAdminOrder("order-id", "PROCESSING")).resolves.toEqual({ id: "order-id", status: "PROCESSING" });
    expect(database.orderUpdateMany).toHaveBeenLastCalledWith({
      where: { id: "order-id", status: "PAID" }, data: { status: "PROCESSING" },
    });
  });
});
