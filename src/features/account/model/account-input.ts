import { z } from "zod";

export const profileUpdateSchema = z.object({
  fullName: z.string().trim().min(2).max(80).nullable().optional(),
  phone: z.string().trim().regex(/^\+?[\d\s()-]{10,20}$/).nullable().optional(),
}).strict().refine((value) => value.fullName !== undefined || value.phone !== undefined);

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

const orderListSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
}).strict();

export function parseOrderListQuery(searchParams: URLSearchParams) {
  const allowed = new Set(["page", "limit"]);
  for (const key of searchParams.keys()) {
    if (!allowed.has(key) || searchParams.getAll(key).length !== 1) return null;
  }
  const parsed = orderListSchema.safeParse(Object.fromEntries(searchParams));
  return parsed.success ? parsed.data : null;
}
