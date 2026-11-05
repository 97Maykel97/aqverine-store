// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaymentResultStatus } from "@/features/payments/ui/PaymentResultStatus";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("payment result", () => {
  it("reads the numeric order number and offers retry only for a confirmed cancellation", async () => {
    const orderId = "914aa099-3590-4c9e-9d37-ea94fe1a1ef4";
    const request = vi.fn(async () => Response.json({
      number: 42,
      status: "CANCELLED",
      paymentStatus: "FAILED",
    }));
    vi.stubGlobal("fetch", request);

    render(<PaymentResultStatus orderId={orderId} />);

    expect(await screen.findByRole("button", { name: /Попробовать оплатить снова/ })).toBeTruthy();
    expect(screen.getByText(/Заказ 42 не ожидает оплаты/)).toBeTruthy();
    expect(request).toHaveBeenCalledWith(`/api/account/orders/${orderId}`, expect.objectContaining({
      credentials: "same-origin",
      cache: "no-store",
    }));
  });
});
