import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/internal/storage/cleanup/route";

const processor = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/features/admin/api/admin-storage", () => ({ processPendingProductImageCleanup: processor.run }));

const secret = "s".repeat(40);
const endpoint = "http://localhost:3000/api/internal/storage/cleanup";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", secret);
  processor.run.mockResolvedValue({ inspected: 1, cleaned: 1, failed: 0, skipped: 0 });
});
afterEach(() => vi.unstubAllEnvs());

describe("internal storage cleanup route", () => {
  it("rejects requests without the configured bearer secret", async () => {
    const response = await POST(new NextRequest(endpoint, { method: "POST" }));
    expect(response.status).toBe(401);
    expect(processor.run).not.toHaveBeenCalled();
  });

  it("runs the queue only for an authorized scheduler", async () => {
    const response = await POST(new NextRequest(endpoint, {
      method: "POST", headers: { authorization: `Bearer ${secret}` },
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ inspected: 1, cleaned: 1, failed: 0, skipped: 0 });
    expect(processor.run).toHaveBeenCalledTimes(1);
  });
});
