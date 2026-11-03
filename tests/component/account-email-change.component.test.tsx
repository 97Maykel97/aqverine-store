// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AccountEmailChangeForm } from "@/features/account/ui/AccountEmailChangeForm";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("account email change form", () => {
  it("sends a validated address and waits for email confirmation", async () => {
    const request = vi.fn(async () => Response.json({ message: "Confirmation sent" }));
    vi.stubGlobal("fetch", request);
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

    render(<QueryClientProvider client={queryClient}><AccountEmailChangeForm email="current@example.com" /></QueryClientProvider>);
    const submit = screen.getByRole("button", { name: /Изменить почту/ });
    expect(submit.hasAttribute("disabled")).toBe(true);

    fireEvent.change(screen.getByRole("textbox", { name: "Почта" }), { target: { value: "new@example.com" } });
    await waitFor(() => expect(submit.hasAttribute("disabled")).toBe(false));
    fireEvent.click(submit);

    await waitFor(() => expect(request).toHaveBeenCalledWith("/api/account/email", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "new@example.com" }),
    })));
    expect(await screen.findByText(/Проверьте почту/)).toBeTruthy();
  });
});
