import { createHash, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

const tokenSchema = z.string().min(32).max(512);

export function isAuthorizedCronRequest(request: NextRequest): boolean {
  const expected = tokenSchema.safeParse(process.env.CRON_SECRET);
  const authorization = request.headers.get("authorization");
  const supplied = tokenSchema.safeParse(authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined);
  if (!expected.success || !supplied.success) return false;
  const expectedHash = createHash("sha256").update(expected.data).digest();
  const suppliedHash = createHash("sha256").update(supplied.data).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}
