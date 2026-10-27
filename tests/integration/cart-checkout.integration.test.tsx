// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { GUEST_CART_STORAGE_KEY } from "@/features/cart/model/guest-cart";
import { CartProvider } from "@/features/cart/ui/CartProvider";
import { CheckoutExperience } from "@/features/checkout/ui/CheckoutExperience";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("guest cart to checkout integration", () => {
  it("caps persisted quantity at stock and shows the same total in checkout", async () => {
    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify([
      { variantId: "essential-t-shirt-0-M", quantity: 99 },
      { variantId: "unknown-variant", quantity: 1 },
    ]));

    render(<CartProvider><CheckoutExperience /></CartProvider>);

    const summary = await screen.findByRole("complementary", { name: "Состав корзины" });
    expect(within(summary).getByText("Белый / M · 8 шт.")).toBeTruthy();
    expect(within(summary).getAllByText("$232")).toHaveLength(2);
    expect(screen.getByText("ОПЛАТА НЕДОСТУПНА В ДЕМО")).toBeTruthy();
    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? "null")).toEqual([
        { variantId: "essential-t-shirt-0-M", quantity: 8 },
      ]);
    });
  });
});
