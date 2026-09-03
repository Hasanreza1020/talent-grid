import { afterEach, describe, expect, it } from "vitest";
import { bootstrapEmails } from "@/lib/auth/allowlist";

const original = process.env.GRID_ALLOWED_EMAILS;

afterEach(() => {
  if (original === undefined) delete process.env.GRID_ALLOWED_EMAILS;
  else process.env.GRID_ALLOWED_EMAILS = original;
});

describe("bootstrapEmails", () => {
  it("is the owner by default", () => {
    delete process.env.GRID_ALLOWED_EMAILS;
    expect(bootstrapEmails()).toEqual(["hasanreza2950@gmail.com"]);
  });

  it("reads the override, normalised", () => {
    process.env.GRID_ALLOWED_EMAILS = "  A@Example.com , b@example.com ";
    expect(bootstrapEmails()).toEqual(["a@example.com", "b@example.com"]);
  });

  it("falls back to the owner rather than opening up when the override is empty", () => {
    // The dangerous failure is an override that parses to nothing and is then
    // read as "no restriction". It must never widen access, and it must never
    // lock the owner out of their own product either.
    process.env.GRID_ALLOWED_EMAILS = "   ,  ,";
    expect(bootstrapEmails()).toEqual(["hasanreza2950@gmail.com"]);
  });

  it("does not admit a lookalike address", () => {
    delete process.env.GRID_ALLOWED_EMAILS;
    const list = bootstrapEmails();
    expect(list).not.toContain("hasanreza2950@gmail.com.evil.com");
    expect(list).not.toContain("x@hasanreza2950@gmail.com");
  });
});
