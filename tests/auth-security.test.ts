import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { isSameOrigin } from "@/features/auth/api/http";
import { allowAuthAttempt } from "@/features/auth/model/rate-limit";

afterEach(() => vi.unstubAllEnvs());

describe("auth request boundaries", () => {
  it("rejects a cross-origin browser submission", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://aqverine.example");
    const trusted = new NextRequest("https://aqverine.example/api/auth/login", {
      headers: { origin: "https://aqverine.example" },
    });
    const foreign = new NextRequest("https://aqverine.example/api/auth/login", {
      headers: { origin: "https://unrelated.example" },
    });

    expect(isSameOrigin(trusted)).toBe(true);
    expect(isSameOrigin(foreign)).toBe(false);
  });

  it("limits repeated attempts per action and email", () => {
    const email = `${randomUUID()}@example.com`;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(allowAuthAttempt("login", email)).toBe(true);
    }
    expect(allowAuthAttempt("login", email)).toBe(false);
    expect(allowAuthAttempt("password-reset", email)).toBe(true);
    expect(allowAuthAttempt("login", `${randomUUID()}@example.com`)).toBe(true);
  });
});
