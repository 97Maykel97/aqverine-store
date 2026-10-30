import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getProfile, PATCH as patchProfile } from "@/app/api/account/profile/route";
import { GET as listOrders } from "@/app/api/account/orders/route";
import { getAccountOrder } from "@/features/account/api/account-service";
import { parseOrderListQuery, profileUpdateSchema } from "@/features/account/model/account-input";

const database = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({ order: { findFirst: database.findFirst } }),
}));

beforeEach(() => database.findFirst.mockReset());
afterEach(() => vi.unstubAllEnvs());

describe("account data API", () => {
  it("limits profile updates to the documented fields and rejects ambiguous pagination", () => {
    expect(profileUpdateSchema.safeParse({ fullName: "Ada", role: "admin" }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({}).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ phone: null }).success).toBe(true);
    expect(parseOrderListQuery(new URLSearchParams("page=1&page=2"))).toBeNull();
    expect(parseOrderListQuery(new URLSearchParams("limit=100"))).toBeNull();
  });

  it("returns a safe unavailable response without configured auth and database", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const response = await getProfile(new NextRequest("http://localhost/api/account/profile"));

    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("DATABASE_URL");
  });

  it("rejects foreign-origin profile updates and invalid order queries", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost");
    const foreign = await patchProfile(new NextRequest("http://localhost/api/account/profile", {
      method: "PATCH",
      headers: { origin: "https://unrelated.example", "content-type": "application/json" },
      body: JSON.stringify({ fullName: "Ada" }),
    }));
    const invalid = await listOrders(new NextRequest("http://localhost/api/account/orders?page=1&page=2"));

    expect(foreign.status).toBe(403);
    expect(invalid.status).toBe(400);
  });

  it("filters a single order by its owner before returning details", async () => {
    const userId = "80f0fbcb-6b94-47aa-9147-f675ad380e9e";
    const orderId = "2ba98a6d-05a1-4ca0-a11f-43e1559d5a21";
    database.findFirst.mockResolvedValue(null);

    expect(await getAccountOrder(userId, orderId)).toBeNull();
    expect(database.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: orderId, userId },
    }));
  });
});
