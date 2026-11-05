import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { processPendingProductImageCleanup } from "@/features/admin/api/admin-storage";

const dependencies = vi.hoisted(() => ({
  findMany: vi.fn(), updateMany: vi.fn(), remove: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({ productImageCleanupJob: { findMany: dependencies.findMany, updateMany: dependencies.updateMany } }),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ storage: { from: () => ({ remove: dependencies.remove }) } }),
}));

const now = new Date("2026-11-05T12:00:00.000Z");
const job = { id: "job-id", storageKey: "product/image.webp", attempts: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  dependencies.findMany.mockResolvedValue([job]);
  dependencies.updateMany.mockResolvedValue({ count: 1 });
  dependencies.remove.mockResolvedValue({ error: null });
});

afterEach(() => vi.unstubAllEnvs());

describe("product image cleanup queue", () => {
  it("claims a job before deleting the object and marks it complete", async () => {
    await expect(processPendingProductImageCleanup({ storageKeys: [job.storageKey], now })).resolves.toEqual({
      inspected: 1, cleaned: 1, failed: 0, skipped: 0,
    });
    expect(dependencies.remove).toHaveBeenCalledWith([job.storageKey]);
    expect(dependencies.updateMany).toHaveBeenCalledTimes(2);
    expect(dependencies.updateMany).toHaveBeenLastCalledWith({
      where: { id: job.id, leaseUntil: new Date("2026-11-05T12:02:00.000Z") },
      data: { completedAt: expect.any(Date), leaseUntil: null },
    });
  });

  it("retries provider failures after a backoff without exposing object details", async () => {
    dependencies.remove.mockResolvedValue({ error: new Error("provider detail") });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await expect(processPendingProductImageCleanup({ now })).resolves.toEqual({
        inspected: 1, cleaned: 0, failed: 1, skipped: 0,
      });
      expect(dependencies.updateMany).toHaveBeenLastCalledWith({
        where: { id: job.id, leaseUntil: new Date("2026-11-05T12:02:00.000Z") },
        data: {
          attempts: { increment: 1 }, nextAttemptAt: new Date("2026-11-05T12:01:00.000Z"), leaseUntil: null,
        },
      });
      expect(log).toHaveBeenCalledWith("Product image storage cleanup failed");
    } finally {
      log.mockRestore();
    }
  });

  it("skips an already claimed job", async () => {
    dependencies.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(processPendingProductImageCleanup({ now })).resolves.toEqual({
      inspected: 1, cleaned: 0, failed: 0, skipped: 1,
    });
    expect(dependencies.remove).not.toHaveBeenCalled();
  });
});
