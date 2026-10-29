import { isAuthConfigured } from "@/features/auth/model/auth-config";
import { createPageAuthClient } from "@/features/auth/api/supabase-server";
import { getPrisma } from "@/shared/lib/prisma";

export async function getCurrentUser() {
  if (!isAuthConfigured()) return null;

  const supabase = await createPageAuthClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const localUser = await getPrisma().user.findUnique({
    where: { id: data.user.id },
    select: { id: true, role: true, profile: { select: { fullName: true } } },
  });

  return localUser
    ? { ...localUser, email: data.user.email ?? "" }
    : null;
}
