import { describe, expect, it } from "vitest";
import { engagementRate, engagementRateLabel } from "@/lib/metrics/engagement";
import { cpm, costPerEngagement } from "@/lib/metrics/cost";
import { growth30d, growth90d } from "@/lib/metrics/growth";
import { postingConsistency } from "@/lib/metrics/consistency";
import { percentileRank, MINIMUM_PEER_GROUP } from "@/lib/metrics/percentile";
import { agencyScore, internalRatingScore, SCORE_WEIGHTS } from "@/lib/metrics/score";

const FULL = {
  avgViews: 100_000,
  avgLikes: 4_000,
  avgComments: 200,
  avgShares: 50,
  followers: 500_000,
};

describe("engagementRate", () => {
  it("divides interactions by average views", () => {
    const result = engagementRate(FULL);
    expect(result.value).toBeCloseTo(4.25, 5);
    expect(result.qualifier).toBeUndefined();
    expect(engagementRateLabel(result)).toBe("Engagement rate");
  });

  it("falls back to followers only when views are missing, and says so", () => {
    const result = engagementRate({ ...FULL, avgViews: null });
    expect(result.value).toBeCloseTo(0.85, 5);
    expect(result.qualifier).toBe("by_followers");
    expect(engagementRateLabel(result)).toBe("ER by followers");
    expect(result.basis).toMatch(/[Nn]ot comparable/);
  });

  it("returns null rather than zero when nothing is recorded", () => {
    const result = engagementRate({
      avgViews: null,
      avgLikes: null,
      avgComments: null,
      avgShares: null,
      followers: 500_000,
    });
    expect(result.value).toBeNull();
    expect(result.basis).toMatch(/No likes, comments or shares/);
  });

  it("does not treat a missing component as zero, and names what it counted", () => {
    const result = engagementRate({ ...FULL, avgShares: null, avgComments: null });
    expect(result.value).toBeCloseTo(4.0, 5);
    expect(result.basis).toMatch(/Counted likes only/);
  });

  it("exposes its inputs for the tooltip", () => {
    expect(engagementRate(FULL).inputs).toMatchObject({
      "Average likes": 4_000,
      "Average views": 100_000,
    });
  });
});

describe("cpm and costPerEngagement", () => {
  it("computes cost per thousand views", () => {
    expect(cpm(50_000, 100_000).value).toBeCloseTo(500, 5);
  });

  it("computes cost per interaction", () => {
    expect(costPerEngagement(50_000, FULL).value).toBeCloseTo(50_000 / 4_250, 5);
  });

  it("returns null with an explanation when there is no rate", () => {
    const result = cpm(null, 100_000);
    expect(result.value).toBeNull();
    expect(result.basis).toMatch(/No rate on file/);
  });

  it("refuses to divide by zero views", () => {
    expect(cpm(50_000, 0).value).toBeNull();
  });
});

describe("follower growth", () => {
  it("is null with fewer than two snapshots", () => {
    expect(growth30d([]).value).toBeNull();
    const single = growth30d([{ capturedOn: "2026-08-01", followers: 1000 }]);
    expect(single.value).toBeNull();
    expect(single.basis).toMatch(/Trend available after the next update/);
  });

  it("compares the latest against the snapshot nearest the window", () => {
    const result = growth30d([
      { capturedOn: "2026-08-31", followers: 110_000 },
      { capturedOn: "2026-08-01", followers: 100_000 },
      { capturedOn: "2026-06-01", followers: 50_000 },
    ]);
    expect(result.value).toBeCloseTo(10, 5);
    expect(result.inputs["Compared snapshot"]).toBe("2026-08-01");
  });

  it("picks a different comparison point for the 90 day window", () => {
    const snapshots = [
      { capturedOn: "2026-08-31", followers: 110_000 },
      { capturedOn: "2026-08-01", followers: 100_000 },
      { capturedOn: "2026-06-02", followers: 50_000 },
    ];
    expect(growth90d(snapshots).inputs["Compared snapshot"]).toBe("2026-06-02");
  });

  it("reports negative growth without special-casing it", () => {
    const result = growth30d([
      { capturedOn: "2026-08-31", followers: 90_000 },
      { capturedOn: "2026-08-01", followers: 100_000 },
    ]);
    expect(result.value).toBeCloseTo(-10, 5);
  });

  it("ignores snapshots with no follower count", () => {
    const result = growth30d([
      { capturedOn: "2026-08-31", followers: 110_000 },
      { capturedOn: "2026-08-15", followers: null },
      { capturedOn: "2026-08-01", followers: 100_000 },
    ]);
    expect(result.value).toBeCloseTo(10, 5);
  });
});

describe("postingConsistency", () => {
  it("is null with fewer than three samples", () => {
    const result = postingConsistency({ postsLast30d: 12, sampleViews: [100, 200] });
    expect(result.value).toBeNull();
    expect(result.basis).toMatch(/at least three content samples/);
  });

  it("scores steady view counts as less variable than erratic ones", () => {
    const steady = postingConsistency({ postsLast30d: 12, sampleViews: [100, 105, 95] });
    const erratic = postingConsistency({ postsLast30d: 12, sampleViews: [10, 500, 90] });
    expect(steady.value!.coefficientOfVariation).toBeLessThan(
      erratic.value!.coefficientOfVariation,
    );
    expect(steady.value!.index).toBeGreaterThan(erratic.value!.index);
  });
});

describe("percentileRank", () => {
  const peers = (values: (number | null)[]) =>
    values.map((value, index) => ({ creatorId: `c${index}`, value }));

  it("returns null below the minimum peer group", () => {
    const result = percentileRank("c0", peers([5, 4, 3, 2]));
    expect(result.value).toBeNull();
    expect(result.basis).toBe("Not enough peers to rank");
    expect(MINIMUM_PEER_GROUP).toBe(5);
  });

  it("puts the best value at the top of the group", () => {
    expect(percentileRank("c0", peers([100, 4, 3, 2, 1])).value).toBe(100);
  });

  it("puts the worst value at the bottom", () => {
    expect(percentileRank("c4", peers([100, 4, 3, 2, 1])).value).toBe(0);
  });

  it("inverts when lower is better", () => {
    const result = percentileRank("c4", peers([100, 4, 3, 2, 1]), { higherIsBetter: false });
    expect(result.value).toBe(100);
  });

  it("splits ties rather than giving both the top spot", () => {
    const result = percentileRank("c0", peers([5, 5, 3, 2, 1]));
    expect(result.value).toBeGreaterThan(50);
    expect(result.value).toBeLessThan(100);
  });

  it("returns null when the creator has no value", () => {
    expect(percentileRank("c0", peers([null, 4, 3, 2, 1])).value).toBeNull();
  });
});

describe("agencyScore", () => {
  const all = {
    engagementRate: 80,
    costPerEngagement: 60,
    growth30d: 40,
    postingConsistency: 100,
    internalRatings: 50,
  };

  it("weights the components exactly as specified", () => {
    const result = agencyScore(all);
    const expected =
      80 * SCORE_WEIGHTS.engagementRate +
      60 * SCORE_WEIGHTS.costPerEngagement +
      40 * SCORE_WEIGHTS.growth30d +
      100 * SCORE_WEIGHTS.postingConsistency +
      50 * SCORE_WEIGHTS.internalRatings;
    expect(result.value!.score).toBeCloseTo(expected, 6);
  });

  it("weights sum to one", () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });

  it("renormalises the remaining weights when a component is null", () => {
    const result = agencyScore({ ...all, internalRatings: null });
    const remaining = 1 - SCORE_WEIGHTS.internalRatings;
    const expected =
      (80 * SCORE_WEIGHTS.engagementRate +
        60 * SCORE_WEIGHTS.costPerEngagement +
        40 * SCORE_WEIGHTS.growth30d +
        100 * SCORE_WEIGHTS.postingConsistency) /
      remaining;
    expect(result.value!.score).toBeCloseTo(expected, 6);
    expect(result.value!.droppedComponents).toEqual(["internalRatings"]);
  });

  it("refuses to score when more than two components are missing", () => {
    const result = agencyScore({
      engagementRate: 80,
      costPerEngagement: 60,
      growth30d: null,
      postingConsistency: null,
      internalRatings: null,
    });
    expect(result.value).toBeNull();
    expect(result.basis).toBe("Insufficient data to score");
  });

  it("still scores with exactly two components missing", () => {
    const result = agencyScore({
      engagementRate: 80,
      costPerEngagement: 60,
      growth30d: 40,
      postingConsistency: null,
      internalRatings: null,
    });
    expect(result.value).not.toBeNull();
  });

  it("always returns a component breakdown for the hover card", () => {
    const breakdown = agencyScore(all).value!.breakdown;
    expect(breakdown).toHaveLength(5);
    expect(breakdown.every((row) => typeof row.label === "string")).toBe(true);
  });
});

describe("internalRatingScore", () => {
  it("rescales 1-to-5 ratings onto 0-to-100", () => {
    expect(
      internalRatingScore([{ professionalism: 5, responsiveness: 5, punctuality: 5 }]),
    ).toBe(100);
    expect(
      internalRatingScore([{ professionalism: 1, responsiveness: 1, punctuality: 1 }]),
    ).toBe(0);
    expect(
      internalRatingScore([{ professionalism: 3, responsiveness: 3, punctuality: 3 }]),
    ).toBe(50);
  });

  it("returns null when nobody has rated the creator", () => {
    expect(internalRatingScore([])).toBeNull();
    expect(
      internalRatingScore([{ professionalism: null, responsiveness: null, punctuality: null }]),
    ).toBeNull();
  });
});
