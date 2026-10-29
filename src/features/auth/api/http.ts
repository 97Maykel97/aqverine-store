import { NextResponse, type NextRequest } from "next/server";

export function authJson(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function readAuthBody(request: NextRequest): Promise<unknown | null> {
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return null;
  if (Number(request.headers.get("content-length") ?? 0) > 4096) return null;

  try {
    const raw = await request.text();
    return raw.length <= 4096 ? JSON.parse(raw) as unknown : null;
  } catch {
    return null;
  }
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const expected = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin
      : request.nextUrl.origin;
    return new URL(origin).origin === expected;
  } catch {
    return false;
  }
}
