import { describe, expect, it, vi } from "vitest";
import type { Candidate } from "@/lib/strategiser/types";

// The pipeline is server-only; the import is stubbed so the pure reconciler
// can be exercised without a database or a network.
vi.mock("server-only", () => ({}));

const { reconcileSelection } = await import("@/lib/strategiser/pipeline");

function candidate(id: string): Candidate {
  return {
    id,
    slug: id,
    name: id,
    handle: null,
    avatarUrl: null,
    category: null,
    categorySlug: null,
    tier: null,
    city: null,
    platforms: [],
    totalReach: null,
    engagementRate: null,
    ratePerPost: 1000,
    agencyScore: null,
    capturedOn: null,
    stale: false,
  };
}

const pool = [candidate("a"), candidate("b"), candidate("c"), candidate("d")];

describe("reconcileSelection", () => {
  it("keeps only ids that were in the pool we sent", () => {
    const result = reconcileSelection(
      {
        selected: [
          { creator_id: "a", reason: "Strong fit", role: "anchor" },
          { creator_id: "ghost-creator", reason: "Invented", role: "niche" },
        ],
      },
      pool,
      2,
    );
    expect(result.picks.map((p) => p.candidate.id)).not.toContain("ghost-creator");
    expect(result.invalidIds).toEqual(["ghost-creator"]);
  });

  it("reports a hallucinated id rather than swallowing it", () => {
    const result = reconcileSelection(
      { selected: [{ creator_id: "nope", reason: "", role: "anchor" }] },
      pool,
      1,
    );
    expect(result.invalidIds).toEqual(["nope"]);
  });

  it("tops up from the pool when invalid ids leave it short", () => {
    const result = reconcileSelection(
      {
        selected: [
          { creator_id: "a", reason: "Good", role: "anchor" },
          { creator_id: "ghost", reason: "Invented", role: "volume" },
        ],
      },
      pool,
      3,
    );
    expect(result.picks).toHaveLength(3);
    expect(result.picks[0].candidate.id).toBe("a");
    // Topped-up entries carry no explanation, because none was given.
    expect(result.picks[1].reason).toBe("");
  });

  it("never returns the same creator twice", () => {
    const result = reconcileSelection(
      {
        selected: [
          { creator_id: "a", reason: "One", role: "anchor" },
          { creator_id: "a", reason: "Again", role: "volume" },
        ],
      },
      pool,
      2,
    );
    expect(new Set(result.picks.map((p) => p.candidate.id)).size).toBe(2);
  });

  it("returns exactly the requested count", () => {
    const result = reconcileSelection(
      {
        selected: pool.map((c) => ({ creator_id: c.id, reason: "r", role: "volume" })),
      },
      pool,
      2,
    );
    expect(result.picks).toHaveLength(2);
  });

  it("falls back to a valid role when the model invents one", () => {
    const result = reconcileSelection(
      { selected: [{ creator_id: "a", reason: "r", role: "superstar" }] },
      pool,
      1,
    );
    expect(result.picks[0].role).toBe("volume");
  });

  it("survives a response with no selected array at all", () => {
    const result = reconcileSelection({}, pool, 2);
    expect(result.picks).toHaveLength(2);
    expect(result.invalidIds).toEqual([]);
  });
});
