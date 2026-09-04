import { afterEach, describe, expect, it } from "vitest";
import { bootstrapEmails } from "@/lib/auth/allowlist";

const original = process.env.GRID_ALLOWED_EMAILS;

afterEach(() => {
  if (original === undefined) delete process.env.GRID_ALLOWED_EMAILS;
  else process.env.GRID_ALLOWED_EMAILS = original;
});

describe("bootstrapEmails", () => {
  it("is empty when nothing is configured, which means no restriction", () => {
    delete process.env.GRID_ALLOWED_EMAILS;
    expect(bootstrapEmails()).toEqual([]);
  });

  it("reads the override, normalised", () => {
    process.env.GRID_ALLOWED_EMAILS = "  A@Example.com , b@example.com ";
    expect(bootstrapEmails()).toEqual(["a@example.com", "b@example.com"]);
  });

  it("treats a whitespace-only override as no restriction rather than nobody", () => {
    // Locking every person out of their own product because a variable was set
    // to a stray comma is a worse failure than leaving it open.
    process.env.GRID_ALLOWED_EMAILS = "   ,  ,";
    expect(bootstrapEmails()).toEqual([]);
  });

  it("does not admit a lookalike of a configured address", () => {
    process.env.GRID_ALLOWED_EMAILS = "owner@example.com";
    const list = bootstrapEmails();
    expect(list).toEqual(["owner@example.com"]);
    expect(list).not.toContain("owner@example.com.evil.com");
    expect(list).not.toContain("x@owner@example.com");
  });
});
