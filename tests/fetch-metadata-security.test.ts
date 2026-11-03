import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { isSameOrigin } from "@/features/auth/api/http";

describe("mutation request origin validation", () => {
  it("rejects cross-site and same-site subdomain requests without an Origin header", () => {
    const from = (site: string) => new NextRequest("https://shop.example.com/api/auth/login", {
      method: "POST",
      headers: { "sec-fetch-site": site },
    });

    expect(isSameOrigin(from("cross-site"))).toBe(false);
    expect(isSameOrigin(from("same-site"))).toBe(false);
    expect(isSameOrigin(from("same-origin"))).toBe(true);
  });
});
