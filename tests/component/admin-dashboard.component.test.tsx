// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminDashboard } from "@/features/admin/ui/AdminDashboard";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("admin dashboard", () => {
  it("shows orders and advances only the operational status", async () => {
    let orderStatus = "PAID";
    const request = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input);
      if (path.startsWith("/api/admin/products")) return Response.json({ items: [], total: 0, page: 1 });
      if (path.startsWith("/api/admin/orders") && init?.method === "PATCH") {
        orderStatus = "PROCESSING";
        return Response.json({ id: "93ec5a62-a215-4bcb-af8c-bc6e42469582", status: orderStatus });
      }
      if (path.startsWith("/api/admin/orders")) return Response.json({
        items: [{
          id: "93ec5a62-a215-4bcb-af8c-bc6e42469582", number: 12, status: orderStatus,
          totalMinor: 2900, createdAt: "2026-11-01T09:00:00.000Z",
          contactName: "Buyer", contactEmail: "buyer@example.test", contactPhone: "+1 555 123 4567",
          items: [{ productName: "City shirt", color: "Black", size: "M", quantity: 1 }],
          payments: [{ status: "PAID" }],
        }], total: 1, page: 1,
      });
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal("fetch", request);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={queryClient}><AdminDashboard /></QueryClientProvider>);
    expect(await screen.findByText("Товаров пока нет. Создай первый черновик выше.")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Заказы/ }));
    expect(await screen.findByText("City shirt · Black / M × 1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Взять в работу/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "В работе" })).toBeTruthy());
    expect(request).toHaveBeenCalledWith(
      "/api/admin/orders/93ec5a62-a215-4bcb-af8c-bc6e42469582",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "PROCESSING" }) }),
    );
  });
});
