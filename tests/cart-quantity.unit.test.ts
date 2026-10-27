import { describe, expect, it } from "vitest";

import { setGuestCartQuantity, type GuestCartLine } from "@/features/cart/model/guest-cart";

describe("cart line isolation", () => {
  it("updates or removes one variant without changing another or mutating the input", () => {
    const firstId = "essential-t-shirt-0-M";
    const secondId = "essential-t-shirt-1-M";
    const original: readonly GuestCartLine[] = [
      { variantId: firstId, quantity: 1 },
      { variantId: secondId, quantity: 2 },
    ];

    const updated = setGuestCartQuantity(original, firstId, 3);
    expect(updated).toEqual([
      { variantId: secondId, quantity: 2 },
      { variantId: firstId, quantity: 3 },
    ]);
    expect(setGuestCartQuantity(updated, firstId, 0)).toEqual([{ variantId: secondId, quantity: 2 }]);
    expect(original).toEqual([
      { variantId: firstId, quantity: 1 },
      { variantId: secondId, quantity: 2 },
    ]);
  });
});
