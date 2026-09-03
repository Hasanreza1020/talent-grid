import { afterEach, describe, expect, it } from "vitest";
import { allowedEmails, isAuthorisedEmail } from "@/lib/auth/allowlist";

const original = process.env.GRID_ALLOWED_EMAILS;

afterEach(() => {
  if (original === undefined) delete process.env.GRID_ALLOWED_EMAILS;
  else process.env.GRID_ALLOWED_EMAILS = original;
});

describe("isAuthorisedEmail", () => {
  it("admits the owner", () => {
    expect(isAuthorisedEmail("hasanreza2950@gmail.com")).toBe(true);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(isAuthorisedEmail("  HasanReza2950@Gmail.com  ")).toBe(true);
  });

  it("refuses everybody else", () => {
    expect(isAuthorisedEmail("farhan@example.com")).toBe(false);
    expect(isAuthorisedEmail("hasanreza2950@gmail.com.evil.com")).toBe(false);
    expect(isAuthorisedEmail("x@hasanreza2950@gmail.com")).toBe(false);
  });

  it("refuses nothing at all", () => {
    expect(isAuthorisedEmail(null)).toBe(false);
    expect(isAuthorisedEmail(undefined)).toBe(false);
    expect(isAuthorisedEmail("")).toBe(false);
    expect(isAuthorisedEmail("   ")).toBe(false);
  });

  it("reads the override when one is set", () => {
    process.env.GRID_ALLOWED_EMAILS = "a@example.com, B@Example.com";
    expect(isAuthorisedEmail("a@example.com")).toBe(true);
    expect(isAuthorisedEmail("b@example.com")).toBe(true);
    expect(isAuthorisedEmail("hasanreza2950@gmail.com")).toBe(false);
  });

  it("falls back to the owner rather than opening up when the override is empty", () => {
    // The dangerous failure is an override that parses to nothing and is then
    // treated as "no restriction". It must never widen access.
    process.env.GRID_ALLOWED_EMAILS = "   ,  ,";
    expect(allowedEmails()).toEqual(["hasanreza2950@gmail.com"]);
    expect(isAuthorisedEmail("anyone@example.com")).toBe(false);
  });
});
