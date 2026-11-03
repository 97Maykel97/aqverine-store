import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getAdminProducts, POST as postAdminProduct } from "@/app/api/admin/products/route";

const mocks = vi.hoisted(() => ({
  configured: true,
  getUser: vi.fn(),
  findUser: vi.fn(),
  findProducts: vi.fn(),
}));

vi.mock("@/features/auth/model/auth-config", () => ({ isAuthConfigured: () => mocks.configured }));
vi.mock("@/features/auth/api/supabase-server", () => ({
  createRouteAuthClient: () => ({
    client: { auth: { getUser: mocks.getUser } },
    finish: (response: Response) => response,
  }),
}));
vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    user: { findUnique: mocks.findUser },
    product: { findMany: mocks.findProducts },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.configured = true;
  mocks.getUser.mockResolvedValue({ data: { user: { id: "71149471-df55-469e-a293-8a19d8a1fa81" } }, error: null });
  mocks.findUser.mockResolvedValue({ id: "71149471-df55-469e-a293-8a19d8a1fa81", role: "USER" });
});

describe("admin API authorization", () => {
  it("does not read products for a signed-in customer", async () => {
    const response = await getAdminProducts(new NextRequest("http://localhost/api/admin/products"));
    expect(response.status).toBe(403);
    expect(mocks.findProducts).not.toHaveBeenCalled();
  });

  it("rejects cross-origin mutations before accessing the session", async () => {
    const response = await postAdminProduct(new NextRequest("http://localhost/api/admin/products", {
      method: "POST",
      headers: { origin: "https://unrelated.example", "content-type": "application/json" },
      body: JSON.stringify({}),
    }));
    expect(response.status).toBe(403);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });

  it("returns a safe unavailable response when authentication is not configured", async () => {
    mocks.configured = false;
    const response = await getAdminProducts(new NextRequest("http://localhost/api/admin/products"));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("DATABASE_URL");
  });
});
