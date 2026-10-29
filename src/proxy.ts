import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig } from "@/features/auth/model/auth-config";

export async function proxy(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return NextResponse.next({ request });

  const pending = new Map<string, { value: string; options: Record<string, unknown> }>();
  const cacheHeaders = new Headers();
  const client = createServerClient(config.url, config.key, {
    cookieOptions: {
      name: "aqverine-auth",
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          pending.set(name, { value, options: options ?? {} });
        }
        for (const [name, value] of Object.entries(headers)) cacheHeaders.set(name, value);
      },
    },
  });

  await client.auth.getUser();
  const response = NextResponse.next({ request });
  for (const [name, { value, options }] of pending) {
    response.cookies.set(name, value, {
      ...options,
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }
  cacheHeaders.forEach((value, name) => response.headers.set(name, value));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/account/:path*", "/aqverine-control/:path*"],
};
