import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/account/email/route";

const mocks = vi.hoisted(() => ({
  getContext: vi.fn(),
  updateUser: vi.fn(),
  allowAttempt: vi.fn(),
}));

vi.mock("@/features/account/api/account-http", () => ({
  accountJson: (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status }),
  readAccountBody: (request: NextRequest) => request.json(),
  getAccountRequestContext: mocks.getContext,
}));
vi.mock("@/features/auth/model/rate-limit", () => ({ allowAuthAttempt: mocks.allowAttempt }));

function request(body: unknown, origin = "https://aqverine.example") {
  return new NextRequest("https://aqverine.example/api/account/email", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://aqverine.example");
  mocks.allowAttempt.mockReturnValue(true);
  mocks.getContext.mockResolvedValue({
    ok: true,
    userId: "5fd19496-0700-4cf9-8255-b10b62c664e0",
    email: "current@example.com",
    authClient: { auth: { updateUser: mocks.updateUser } },
    finish: (response: NextResponse) => response,
  });
  mocks.updateUser.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllEnvs());

describe("account email change API", () => {
  it("rejects a foreign origin and malformed input before reading the session", async () => {
    const foreign = await POST(request({ email: "new@example.com" }, "https://unrelated.example"));
    const invalid = await POST(request({ email: "bad-address", role: "admin" }));

    expect(foreign.status).toBe(403);
    expect(invalid.status).toBe(400);
    expect(mocks.getContext).not.toHaveBeenCalled();
  });

  it("requests a confirmed email change for the authenticated user", async () => {
    const result = await POST(request({ email: "new@example.com" }));

    expect(result.status).toBe(200);
    expect(mocks.updateUser).toHaveBeenCalledWith(
      { email: "new@example.com" },
      { emailRedirectTo: "https://aqverine.example/auth/callback" },
    );
    expect(JSON.stringify(await result.json())).not.toContain("current@example.com");
  });

  it("keeps provider rejection details out of the response", async () => {
    mocks.updateUser.mockResolvedValue({ error: new Error("Sensitive provider detail") });
    const result = await POST(request({ email: "new@example.com" }));

    expect(result.status).toBe(200);
    expect(JSON.stringify(await result.json())).not.toContain("Sensitive provider detail");
  });
});
