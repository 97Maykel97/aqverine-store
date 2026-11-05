import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

import { PRODUCT_IMAGE_BUCKET } from "@/features/catalog/api/storage-image-url";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";

const MIME_EXTENSIONS: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const CLEANUP_BATCH_SIZE = 25;
const CLEANUP_LEASE_MS = 2 * 60 * 1000;
const CLEANUP_MAX_BACKOFF_MS = 60 * 60 * 1000;

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isProductStorageAvailable() {
  return getStorageClient() !== null;
}

export async function processPendingProductImageCleanup(options: { storageKeys?: string[]; now?: Date } = {}) {
  const { storageKeys, now = new Date() } = options;
  if (storageKeys?.length === 0) return { inspected: 0, cleaned: 0, failed: 0, skipped: 0 };
  const storage = getStorageClient();
  if (!storage) throw new AdminStorageError("UNAVAILABLE");
  const prisma = getPrisma();
  const availableLease = { OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] };
  const jobs = await prisma.productImageCleanupJob.findMany({
    where: {
      completedAt: null, nextAttemptAt: { lte: now },
      ...availableLease,
      ...(storageKeys ? { storageKey: { in: storageKeys } } : {}),
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: CLEANUP_BATCH_SIZE,
    select: { id: true, storageKey: true, attempts: true },
  });

  let cleaned = 0;
  let failed = 0;
  let skipped = 0;
  for (const job of jobs) {
    const leaseUntil = new Date(now.getTime() + CLEANUP_LEASE_MS);
    const claimed = await prisma.productImageCleanupJob.updateMany({
      where: { id: job.id, completedAt: null, nextAttemptAt: { lte: now }, ...availableLease },
      data: { leaseUntil },
    });
    if (!claimed.count) { skipped += 1; continue; }

    try {
      const removed = await storage.storage.from(PRODUCT_IMAGE_BUCKET).remove([job.storageKey]);
      if (removed.error) throw removed.error;
      const finished = await prisma.productImageCleanupJob.updateMany({
        where: { id: job.id, leaseUntil }, data: { completedAt: new Date(), leaseUntil: null },
      });
      if (finished.count) cleaned += 1;
      else skipped += 1;
    } catch {
      const backoff = Math.min(CLEANUP_MAX_BACKOFF_MS, 60_000 * 2 ** Math.min(job.attempts, 6));
      await prisma.productImageCleanupJob.updateMany({
        where: { id: job.id, leaseUntil },
        data: { attempts: { increment: 1 }, nextAttemptAt: new Date(now.getTime() + backoff), leaseUntil: null },
      });
      failed += 1;
      console.error("Product image storage cleanup failed");
    }
  }
  return { inspected: jobs.length, cleaned, failed, skipped };
}

export async function cleanupProductStorageImages(keys: string[]) {
  if (!keys.length) return;
  try {
    await processPendingProductImageCleanup({ storageKeys: keys });
  } catch {
    console.error("Product image storage cleanup could not start");
  }
}

export class AdminStorageError extends Error {
  constructor(readonly code: "UNAVAILABLE" | "INVALID_FILE" | "PRODUCT_NOT_FOUND") {
    super(code);
  }
}

export async function uploadProductImage(productId: string, file: File, input: { color: string | null; altText: string; sortOrder: number }) {
  const storage = getStorageClient();
  if (!storage) throw new AdminStorageError("UNAVAILABLE");
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension || file.size < 1 || file.size > 5 * 1024 * 1024) throw new AdminStorageError("INVALID_FILE");
  const product = await getPrisma().product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new AdminStorageError("PRODUCT_NOT_FOUND");

  const storageKey = `${productId}/${randomUUID()}.${extension}`;
  const bytes = await file.arrayBuffer();
  const signature = new Uint8Array(bytes);
  const matchesType = file.type === "image/jpeg"
    ? signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
    : file.type === "image/png"
      ? [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => signature[index] === byte)
      : signature[0] === 0x52 && signature[1] === 0x49 && signature[2] === 0x46 && signature[3] === 0x46 &&
        signature[8] === 0x57 && signature[9] === 0x45 && signature[10] === 0x42 && signature[11] === 0x50;
  if (!matchesType) throw new AdminStorageError("INVALID_FILE");
  const bucket = storage.storage.from(PRODUCT_IMAGE_BUCKET);
  const uploaded = await bucket.upload(storageKey, bytes, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (uploaded.error) throw new AdminStorageError("UNAVAILABLE");
  try {
    return await getPrisma().productImage.create({
      data: { productId, storageKey, color: input.color, altText: input.altText, sortOrder: input.sortOrder },
      select: { id: true, productId: true, storageKey: true, color: true, altText: true, sortOrder: true },
    });
  } catch (error) {
    await bucket.remove([storageKey]);
    throw error;
  }
}

export async function updateProductImageOrder(imageId: string, sortOrder: number) {
  const result = await getPrisma().productImage.updateMany({ where: { id: imageId }, data: { sortOrder } });
  if (!result.count) throw new AdminStorageError("PRODUCT_NOT_FOUND");
  return { id: imageId, sortOrder };
}

export async function deleteProductImage(imageId: string) {
  const storage = getStorageClient();
  const storageKey = await getPrisma().$transaction(async (transaction) => {
    const image = await transaction.productImage.findUnique({
      where: { id: imageId },
      select: { storageKey: true, product: { select: { status: true, images: { select: { id: true } } } } },
    });
    if (!image) throw new AdminStorageError("PRODUCT_NOT_FOUND");
    if (image.storageKey && !storage) throw new AdminStorageError("UNAVAILABLE");
    if (image.product.status === "PUBLISHED" && image.product.images.length <= 1) throw new AdminStorageError("INVALID_FILE");
    if (image.storageKey) {
      await transaction.productImageCleanupJob.createMany({
        data: [{ storageKey: image.storageKey }], skipDuplicates: true,
      });
    }
    await transaction.productImage.delete({ where: { id: imageId } });
    return image.storageKey;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (storageKey) await cleanupProductStorageImages([storageKey]);
  return { deleted: true };
}
