import type { User } from "@supabase/supabase-js";

import { getPrisma } from "@/shared/lib/prisma";

export async function syncAuthUser(user: User): Promise<void> {
  const prisma = getPrisma();
  const name = typeof user.user_metadata.name === "string"
    ? user.user_metadata.name.trim().slice(0, 60)
    : null;

  await prisma.user.upsert({
    where: { id: user.id },
    create: { id: user.id, profile: { create: { fullName: name } } },
    update: {},
  });
}
