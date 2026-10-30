import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as getCart } from "@/app/api/cart/route";
import { PUT as putCartItem } from "@/app/api/cart/items/route";

afterEach(() => vi.unstubAllEnvs());

describe("server cart API boundary", () => {
  it("returns a safe unavailable response without auth and database configuration", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const response = await getCart(new NextRequest("http://localhost/api/cart"));

    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("DATABASE_URL");
  });

  it("rejects malformed quantities and foreign origins before cart mutation", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost");
    const payload = JSON.stringify({ variantId: "not-a-uuid", quantity: -4 });
    const invalid = await putCartItem(new NextRequest("http://localhost/api/cart/items", {
      method: "PUT",
      headers: { origin: "http://localhost", "content-type": "application/json" },
      body: payload,
    }));
    const foreign = await putCartItem(new NextRequest("http://localhost/api/cart/items", {
      method: "PUT",
      headers: { origin: "https://unrelated.example", "content-type": "application/json" },
      body: payload,
    }));

    expect(invalid.status).toBe(400);
    expect(foreign.status).toBe(403);
  });
});
