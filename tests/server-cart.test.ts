import { describe, expect, it } from "vitest";

import { mergeCartSchema, planGuestCartMerge, setCartItemSchema } from "@/features/cart/model/server-cart";

describe("server cart merge", () => {
  it("combines duplicate guest lines with existing quantities within stock and reports unavailable items", () => {
    const plan = planGuestCartMerge(
      [
        { sku: "shirt-black-m", quantity: 2 },
        { sku: "shirt-black-m", quantity: 1 },
        { sku: "hoodie-blue-l", quantity: 5 },
        { sku: "missing-size", quantity: 1 },
      ],
      [
        { id: "variant-shirt", sku: "shirt-black-m", stock: 4, existingQuantity: 2 },
        { id: "variant-hoodie", sku: "hoodie-blue-l", stock: 0, existingQuantity: 0 },
      ],
    );

    expect(plan.updates).toEqual([
      { variantId: "variant-shirt", quantity: 4 },
      { variantId: "variant-hoodie", quantity: 0 },
    ]);
    expect(plan.adjusted).toEqual(["shirt-black-m"]);
    expect(plan.skipped).toEqual(["hoodie-blue-l", "missing-size"]);
  });

  it("rejects invalid quantities and unbounded merge payloads", () => {
    expect(setCartItemSchema.safeParse({ variantId: "not-a-uuid", quantity: -1 }).success).toBe(false);
    expect(mergeCartSchema.safeParse({
      mergeKey: "4e93ab4b-c545-4cd1-8693-c8c83b28e743",
      lines: Array.from({ length: 51 }, () => ({ sku: "shirt-black-m", quantity: 1 })),
    }).success).toBe(false);
  });
});
