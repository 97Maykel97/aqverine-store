import { createHash } from "node:crypto";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_KEYS = 5000;
const attempts = new Map<string, { count: number; expiresAt: number }>();

export function allowAuthAttempt(action: string, email: string, limit = 5): boolean {
  const now = Date.now();
  const digest = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  const key = `${action}:${digest}`;
  const existing = attempts.get(key);

  if (existing && existing.expiresAt > now && existing.count >= limit) return false;
  if (attempts.size >= MAX_KEYS) {
    for (const [entryKey, entry] of attempts) {
      if (entry.expiresAt <= now) attempts.delete(entryKey);
    }
    while (attempts.size >= MAX_KEYS) {
      const oldestKey = attempts.keys().next().value;
      if (!oldestKey) break;
      attempts.delete(oldestKey);
    }
  }
  attempts.set(key, {
    count: existing && existing.expiresAt > now ? existing.count + 1 : 1,
    expiresAt: existing && existing.expiresAt > now ? existing.expiresAt : now + WINDOW_MS,
  });

  return true;
}
