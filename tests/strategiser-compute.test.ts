import { describe, expect, it } from "vitest";
import {
  computeTotals,
  fitToBudget,
  plainRanking,
  poolScore,
  swapPick,
} from "@/lib/strategiser/compute";
import type { Candidate, Pick } from "@/lib/strategiser/types";

function candidate(overrides: Partial<Candidate> & { id: string }): Candidate {
  return {
    slug: overrides.id,
    name: overrides.id,
    handle: null,
    avatarUrl: null,
    category: null,
    categorySlug: null,
    tier: null,
    city: null,
    platforms: [],
    totalReach: null,
    engagementRate: null,
    ratePerPost: 10_000,
    agencyScore: null,
    capturedOn: null,
    stale: false,
    ...overrides,
  };
}

const pick = (c: Candidate): Pick => ({ candidate: c, reason: "", role: "anchor" });

describe("computeTotals", () => {
  it("sums spend and reports what is left", () => {
    const totals = computeTotals(
      [pick(candidate({ id: "a", ratePerPost: 30_000 })), pick(candidate({ id: "b", ratePerPost: 20_000 }))],
      100_000,
      [],
    );
    expect(totals.spend).toBe(50_000);
    expect(totals.remaining).toBe(50_000);
  });

  it("reports a negative remaining when over budget rather than clamping", () => {
    const totals = computeTotals([pick(candidate({ id: "a", ratePerPost: 90_000 }))], 50_000, []);
    expect(totals.remaining).toBe(-40_000);
  });

  it("leaves reach and cost per thousand null when no reach is on file", () => {
    const totals = computeTotals([pick(candidate({ id: "a" }))], 100_000, []);
    expect(totals.combinedReach).toBeNull();
    expect(totals.costPerThousandReach).toBeNull();
  });

  it("computes cost per thousand reach from spend and reach", () => {
    const totals = computeTotals(
      [pick(candidate({ id: "a", ratePerPost: 50_000, totalReach: 1_000_000 }))],
      100_000,
      [],
    );
    expect(totals.costPerThousandReach).toBe(50);
  });

  it("averages only the engagement rates that exist", () => {
    const totals = computeTotals(
      [
        pick(candidate({ id: "a", engagementRate: 4 })),
        pick(candidate({ id: "b", engagementRate: 2 })),
        pick(candidate({ id: "c" })),
      ],
      100_000,
      [1, 5, 3],
    );
    expect(totals.averageEngagement).toBe(3);
    expect(totals.rosterMedianEngagement).toBe(3);
  });
});

describe("plainRanking", () => {
  it("takes the best blend that the budget covers", () => {
    const pool = [
      candidate({ id: "rich", ratePerPost: 90_000, engagementRate: 9 }),
      candidate({ id: "good", ratePerPost: 20_000, engagementRate: 6 }),
      candidate({ id: "ok", ratePerPost: 20_000, engagementRate: 3 }),
    ];
    const chosen = plainRanking(pool, 2, 50_000);
    expect(chosen.map((c) => c.id)).toEqual(["good", "ok"]);
  });

  it("still returns the requested count when the budget cannot cover it", () => {
    const pool = [
      candidate({ id: "a", ratePerPost: 80_000, engagementRate: 9 }),
      candidate({ id: "b", ratePerPost: 70_000, engagementRate: 8 }),
    ];
    const chosen = plainRanking(pool, 2, 10_000);
    expect(chosen).toHaveLength(2);
  });

  it("never returns the same creator twice", () => {
    const pool = [
      candidate({ id: "a", ratePerPost: 80_000 }),
      candidate({ id: "b", ratePerPost: 70_000 }),
    ];
    const chosen = plainRanking(pool, 2, 10_000);
    expect(new Set(chosen.map((c) => c.id)).size).toBe(2);
  });
});

describe("fitToBudget", () => {
  it("does nothing when already inside budget", () => {
    const picks = [pick(candidate({ id: "a", ratePerPost: 10_000 }))];
    const result = fitToBudget(picks, [], 50_000);
    expect(result.swapped).toBeNull();
    expect(result.picks).toBe(picks);
  });

  it("swaps the dearest pick for the closest cheaper bench candidate", () => {
    const picks = [
      pick(candidate({ id: "dear", ratePerPost: 80_000 })),
      pick(candidate({ id: "cheap", ratePerPost: 10_000 })),
    ];
    const bench = [
      candidate({ id: "mid", ratePerPost: 40_000 }),
      candidate({ id: "tiny", ratePerPost: 5_000 }),
    ];
    const result = fitToBudget(picks, bench, 60_000);
    expect(result.swapped).toEqual({ out: "dear", in: "mid" });
    expect(result.picks.map((p) => p.candidate.id)).toEqual(["mid", "cheap"]);
    // The one that came out is available to swap back in.
    expect(result.bench.map((c) => c.id)).toContain("dear");
  });

  it("reports no swap when nothing on the bench is cheaper", () => {
    const picks = [pick(candidate({ id: "dear", ratePerPost: 80_000 }))];
    const bench = [candidate({ id: "dearer", ratePerPost: 90_000 })];
    expect(fitToBudget(picks, bench, 10_000).swapped).toBeNull();
  });
});

describe("swapPick", () => {
  it("exchanges a pick for a bench candidate and keeps the role", () => {
    const picks: Pick[] = [
      { candidate: candidate({ id: "out" }), reason: "r", role: "niche" },
    ];
    const bench = [candidate({ id: "in" })];
    const result = swapPick(picks, bench, "out", "in");
    expect(result.picks[0].candidate.id).toBe("in");
    expect(result.picks[0].role).toBe("niche");
    expect(result.bench.map((c) => c.id)).toEqual(["out"]);
  });

  it("is a no-op when either side is unknown", () => {
    const picks: Pick[] = [{ candidate: candidate({ id: "a" }), reason: "", role: "anchor" }];
    expect(swapPick(picks, [], "a", "ghost").picks).toBe(picks);
  });
});

describe("poolScore", () => {
  it("weights measured engagement above the assigned score", () => {
    const engaged = candidate({ id: "a", engagementRate: 5, agencyScore: 0 });
    const scored = candidate({ id: "b", engagementRate: 0, agencyScore: 100 });
    expect(poolScore(engaged)).toBeGreaterThan(0);
    expect(poolScore(scored)).toBe(40);
    expect(poolScore(engaged)).toBe(50);
  });

  it("sorts a creator with neither figure last rather than dropping it", () => {
    expect(poolScore(candidate({ id: "bare" }))).toBe(0);
  });
});
