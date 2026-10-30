// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountDashboard } from "@/features/account/ui/AccountDashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const orderId = "93ec5a62-a215-4bcb-af8c-bc6e42469582";
const initialProfile = { email: "buyer@example.test", fullName: "Анна", phone: null };
const initialOrders = {
  items: [{
    id: orderId,
    number: 12,
    status: "PENDING_PAYMENT" as const,
    paymentStatus: "PENDING" as const,
    totalMinor: 2900,
    currency: "USD",
    createdAt: "2026-10-30T09:00:00.000Z",
    items: [{ productName: "Футболка Essential", color: "Чёрный", size: "M", quantity: 1, unitPriceMinor: 2900, lineTotalMinor: 2900 }],
  }],
  page: 1,
  limit: 10,
  total: 1,
  pages: 1,
};

describe("authenticated account dashboard", () => {
  it("saves profile changes and opens the owner's order details", async () => {
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/account/profile" && init?.method === "PATCH") {
        return Response.json({ ...initialProfile, fullName: "Нина" });
      }
      if (String(input) === `/api/account/orders/${orderId}`) {
        return Response.json({
          ...initialOrders.items[0],
          subtotalMinor: 2900,
          paidAt: null,
          contact: { name: "Нина", phone: "+1 555 123 4567", email: initialProfile.email },
          comment: null,
        });
      }
      return new Response(null, { status: 503 });
    });
    vi.stubGlobal("fetch", request);

    render(<AccountDashboard initialProfile={initialProfile} initialOrders={initialOrders} />);
    expect(screen.getByText("Заказ №12")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Нина" } });
    const save = screen.getByRole("button", { name: /Сохранить данные/ });
    await waitFor(() => expect(save.hasAttribute("disabled")).toBe(false));
    fireEvent.click(save);
    expect(await screen.findByText("Данные сохранены.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Посмотреть детали/ }));
    expect(await screen.findByText("Футболка Essential")).toBeTruthy();
    expect(request).toHaveBeenCalledWith(`/api/account/orders/${orderId}`, expect.any(Object));
  });
});
