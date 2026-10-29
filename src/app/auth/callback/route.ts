import { NextResponse, type NextRequest } from "next/server";

import { createRouteAuthClient } from "@/features/auth/api/supabase-server";
import { syncAuthUser } from "@/features/auth/api/sync-user";
import { isAuthConfigured } from "@/features/auth/model/auth-config";

export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next");
  const target = next === "/account/update-password" ? next : "/account";
  const failure = () => NextResponse.redirect(new URL("/login?error=confirmation", origin));

  if (!isAuthConfigured() || !code || code.length > 2048) return failure();
  const context = createRouteAuthClient(request);
  if (!context) return failure();

  try {
    const { error } = await context.client.auth.exchangeCodeForSession(code);
    if (error) return context.finish(failure());
    const { data, error: userError } = await context.client.auth.getUser();
    if (userError || !data.user) return context.finish(failure());
    await syncAuthUser(data.user);
    return context.finish(NextResponse.redirect(new URL(target, origin)));
  } catch {
    await context.client.auth.signOut().catch(() => undefined);
    console.error("Authentication callback failed");
    return failure();
  }
}
