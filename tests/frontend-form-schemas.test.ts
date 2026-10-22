import { describe, expect, it } from "vitest";

import {
  loginSchema,
  passwordResetSchema,
  registrationSchema,
} from "../src/features/auth/model/demo-auth";
import { checkoutSchema } from "../src/features/checkout/model/demo-checkout";

describe("demo authentication forms", () => {
  it("requires valid credentials and a minimum password length", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "123" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "demo@example.com", password: "password123" }).success).toBe(true);
  });

  it("rejects mismatched registration passwords", () => {
    expect(registrationSchema.safeParse({
      name: "Alex", email: "demo@example.com", password: "password123", confirmation: "different123",
    }).success).toBe(false);
  });

  it("only validates the email format for password reset", () => {
    expect(passwordResetSchema.safeParse({ email: "demo@example.com" }).success).toBe(true);
    expect(passwordResetSchema.safeParse({ email: "invalid" }).success).toBe(false);
  });
});

describe("demo checkout form", () => {
  const fields = {
    name: "Alex",
    email: "demo@example.com",
    phone: "+1 555 123 4567",
    comment: "",
    consent: true,
  };

  it("requires explicit demo consent", () => {
    expect(checkoutSchema.safeParse({ ...fields, consent: false }).success).toBe(false);
    expect(checkoutSchema.safeParse(fields).success).toBe(true);
  });

  it("rejects malformed contact details and oversized comments", () => {
    expect(checkoutSchema.safeParse({ ...fields, phone: "123" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...fields, comment: "x".repeat(501) }).success).toBe(false);
  });
});
