import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

import { getSupabaseConfig } from "@/features/auth/model/auth-config";

const secureCookieOptions = {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};
const cookieOptions = { name: "aqverine-auth", ...secureCookieOptions };

export async function createPageAuthClient() {
  const config = getSupabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions,
    cookies: {
      getAll: () => cookieStore.getAll(),
      // The proxy refreshes sessions before Server Components render.
      setAll: () => undefined,
    },
  });
}

export function createRouteAuthClient(request: NextRequest) {
  const config = getSupabaseConfig();
  if (!config) return null;

  const pending = new Map<string, { value: string; options: CookieOptions }>();
  const cacheHeaders = new Headers();
  const client = createServerClient(config.url, config.key, {
    cookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          pending.set(name, { value, options });
        }
        for (const [name, value] of Object.entries(headers)) cacheHeaders.set(name, value);
      },
    },
  });

  return {
    client,
    finish(response: NextResponse): NextResponse {
      for (const [name, { value, options }] of pending) {
        response.cookies.set(name, value, { ...options, ...secureCookieOptions });
      }
      cacheHeaders.forEach((value, name) => response.headers.set(name, value));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    },
  };
}
