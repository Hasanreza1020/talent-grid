import { describe, expect, it } from "vitest";
import { buildComparison, summariseComparison, audienceSimilarity } from "@/lib/compare";
import type { CompareCreator } from "@/lib/db/compare";
import type { CreatorMetrics } from "@/lib/metrics/directory";
import { noData } from "@/lib/metrics/types";

function creator(overrides: Partial<CompareCreator> & { id: string; displayName: string }): CompareCreator {
  const base = {
    slug: overrides.id,
    bioShort: null,
    portraitUrl: null,
    gender: "undisclosed" as const,
    city: null,
    country: "Bangladesh",
    primaryLanguage: "bangla" as const,
    tier: "mid" as const,
    primaryPlatform: "facebook" as const,
    status: "active" as const,
    acceptsBarter: null,
    dataConfidence: "unverified" as const,
    deletedAt: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    primaryAccountId: `${overrides.id}-acc`,
    primaryHandle: overrides.id,
    primaryProfileUrl: "https://example.test",
    primaryFollowers: null,
    primaryAvgViews: null,
    primaryAvgLikes: null,
    primaryAvgComments: null,
    primaryAvgShares: null,
    primaryPostsLast30d: null,
    primaryEngagementRate: null,
    primaryCapturedOn: null,
    totalReach: null,
    accountCount: 1,
    oldestCapture: null,
    cheapestRateBdt: null,
    previousFollowers: null,
    previousCapturedOn: null,
    sampleCount: 0,
    sampleMeanViews: null,
    sampleSdViews: null,
    ratingAverage: null,
    primaryCategoryId: "cat",
    primaryCategorySlug: "travel",
    primaryCategoryName: "Travel",
    primaryCategoryParentId: null,
    openConflictCount: 0,
    categories: [],
    tags: [],
    accounts: [],
    rates: [],
    audience: null,
    conflicts: [],
    collaborationCount: 0,
    averageDeliveredEngagement: null,
    ratingAverageVisible: null,
    primarySnapshots: [],
  };
  return { ...base, ...overrides } as CompareCreator;
}

const emptyMetrics = (): CreatorMetrics => ({
  engagement: noData("none"),
  growth30d: noData("none"),
  consistencyIndex: noData("none"),
  cheapestCpm: noData("none"),
  cheapestCostPerEngagement: noData("none"),
  percentiles: {
    engagement: noData("none"),
    costPerEngagement: noData("none"),
    growth: noData("none"),
    consistency: noData("none"),
    reach: noData("none"),
  },
  score: noData("Insufficient data to score"),
  peerGroupSize: 0,
});

const metricsFor = (ids: string[]) =>
  new Map(ids.map((id) => [id, emptyMetrics()] as const));

const options = { platform: null, deliverable: null, normalised: false };

function rowByKey(groups: ReturnType<typeof buildComparison>, key: string) {
  return groups.flatMap((group) => group.rows).find((row) => row.key === key)!;
}

describe("best-value marking", () => {
  it("marks the highest value where higher is better", () => {
    const creators = [
      creator({ id: "a", displayName: "A", totalReach: 500_000 }),
      creator({ id: "b", displayName: "B", totalReach: 900_000 }),
      creator({ id: "c", displayName: "C", totalReach: 100_000 }),
    ];
    const row = rowByKey(buildComparison(creators, metricsFor(["a", "b", "c"]), options), "total-reach");

    expect(row.cells.find((cell) => cell.isBest)?.creatorId).toBe("b");
    expect(row.cells.filter((cell) => cell.isBest)).toHaveLength(1);
  });

  it("marks the lowest value where lower is better", () => {
    const creators = [
      creator({ id: "a", displayName: "A", rates: [{ platform: "facebook", deliverable: "reel", priceBdt: 50_000, negotiable: true }] }),
      creator({ id: "b", displayName: "B", rates: [{ platform: "facebook", deliverable: "reel", priceBdt: 20_000, negotiable: true }] }),
      creator({ id: "c", displayName: "C", rates: [{ platform: "facebook", deliverable: "reel", priceBdt: 90_000, negotiable: true }] }),
    ];
    const row = rowByKey(
      buildComparison(creators, metricsFor(["a", "b", "c"]), options),
      "cheapest-rate",
    );

    expect(row.cells.find((cell) => cell.isBest)?.creatorId).toBe("b");
  });

  it("suppresses marking entirely when two or more values are missing", () => {
    const creators = [
      creator({ id: "a", displayName: "A", totalReach: 500_000 }),
      creator({ id: "b", displayName: "B", totalReach: null }),
      creator({ id: "c", displayName: "C", totalReach: null }),
    ];
    const row = rowByKey(buildComparison(creators, metricsFor(["a", "b", "c"]), options), "total-reach");

    expect(row.markingSuppressed).toBe(true);
    expect(row.cells.some((cell) => cell.isBest)).toBe(false);
  });

  it("still marks when exactly one value is missing", () => {
    const creators = [
      creator({ id: "a", displayName: "A", totalReach: 500_000 }),
      creator({ id: "b", displayName: "B", totalReach: 900_000 }),
      creator({ id: "c", displayName: "C", totalReach: null }),
    ];
    const row = rowByKey(buildComparison(creators, metricsFor(["a", "b", "c"]), options), "total-reach");

    expect(row.markingSuppressed).toBe(false);
    expect(row.cells.find((cell) => cell.isBest)?.creatorId).toBe("b");
  });

  it("marks every cell that ties for best rather than picking one arbitrarily", () => {
    const creators = [
      creator({ id: "a", displayName: "A", totalReach: 900_000 }),
      creator({ id: "b", displayName: "B", totalReach: 900_000 }),
      creator({ id: "c", displayName: "C", totalReach: 100_000 }),
    ];
    const row = rowByKey(buildComparison(creators, metricsFor(["a", "b", "c"]), options), "total-reach");

    expect(row.cells.filter((cell) => cell.isBest).map((cell) => cell.creatorId)).toEqual([
      "a",
      "b",
    ]);
  });

  it("never marks a text row", () => {
    const creators = [
      creator({ id: "a", displayName: "A", city: "Dhaka" }),
      creator({ id: "b", displayName: "B", city: "Chattogram" }),
    ];
    const row = rowByKey(buildComparison(creators, metricsFor(["a", "b"]), options), "city");

    expect(row.direction).toBeNull();
    expect(row.cells.some((cell) => cell.isBest)).toBe(false);
  });
});

describe("missing data", () => {
  it("renders No data rather than zero, and never drops the row", () => {
    const creators = [
      creator({ id: "a", displayName: "A" }),
      creator({ id: "b", displayName: "B" }),
    ];
    const row = rowByKey(buildComparison(creators, metricsFor(["a", "b"]), options), "total-reach");

    expect(row.allMissing).toBe(true);
    for (const cell of row.cells) {
      expect(cell.display).toBe("No data");
      expect(cell.display).not.toBe("0");
      expect(cell.display).not.toBe("-");
    }
  });

  it("says 'No rate on file' rather than a zero price", () => {
    const creators = [
      creator({ id: "a", displayName: "A" }),
      creator({ id: "b", displayName: "B" }),
    ];
    const row = rowByKey(buildComparison(creators, metricsFor(["a", "b"]), options), "cheapest-rate");

    expect(row.cells.every((cell) => cell.display === "No rate on file")).toBe(true);
  });

  it("keeps every attribute group present", () => {
    const groups = buildComparison(
      [creator({ id: "a", displayName: "A" }), creator({ id: "b", displayName: "B" })],
      metricsFor(["a", "b"]),
      options,
    );
    expect(groups.map((group) => group.key)).toEqual([
      "identity",
      "reach",
      "engagement",
      "growth",
      "cost",
      "audience",
      "track",
      "score",
    ]);
  });
});

describe("percentile mode", () => {
  it("flips direction to higher-is-better for cost when normalised", () => {
    const creators = [
      creator({ id: "a", displayName: "A" }),
      creator({ id: "b", displayName: "B" }),
    ];
    const metrics = metricsFor(["a", "b"]);
    metrics.get("a")!.percentiles.costPerEngagement = {
      value: 90,
      basis: "test",
      inputs: {},
    };
    metrics.get("b")!.percentiles.costPerEngagement = {
      value: 30,
      basis: "test",
      inputs: {},
    };

    const row = rowByKey(
      buildComparison(creators, metrics, { ...options, normalised: true }),
      "cpe",
    );

    // A higher percentile means cheaper, so A wins even though the row is
    // "lower is better" in absolute mode.
    expect(row.direction).toBe("higher");
    expect(row.cells.find((cell) => cell.isBest)?.creatorId).toBe("a");
    expect(row.cells[0].display).toBe("90th percentile");
  });
});

describe("summariseComparison", () => {
  it("names the leader on reach", () => {
    const creators = [
      creator({ id: "a", displayName: "Alpha", totalReach: 100_000 }),
      creator({ id: "b", displayName: "Beta", totalReach: 900_000 }),
    ];
    const groups = buildComparison(creators, metricsFor(["a", "b"]), options);
    const summary = summariseComparison(creators, groups);

    expect(summary.join(" ")).toMatch(/Beta has the largest total reach/);
  });

  it("caveats when rows were too thin to mark", () => {
    const creators = [
      creator({ id: "a", displayName: "Alpha" }),
      creator({ id: "b", displayName: "Beta" }),
    ];
    const groups = buildComparison(creators, metricsFor(["a", "b"]), options);
    const summary = summariseComparison(creators, groups);

    expect(summary.join(" ")).toMatch(/not enough recorded data|Read this with care/i);
  });

  it("is generated from the data, with no placeholder text", () => {
    const creators = [
      creator({ id: "a", displayName: "Alpha", totalReach: 900_000 }),
      creator({ id: "b", displayName: "Beta", totalReach: 100_000 }),
    ];
    const summary = summariseComparison(
      creators,
      buildComparison(creators, metricsFor(["a", "b"]), options),
    );
    expect(summary.every((sentence) => sentence.trim().endsWith("."))).toBe(true);
  });
});

describe("audienceSimilarity", () => {
  const profile = (ageBrackets: Record<string, number>) => ({
    id: "x",
    accountId: "y",
    capturedOn: "2026-08-01",
    ageBrackets,
    genderSplit: null,
    topCities: null,
    topCountries: null,
    authenticityScore: null,
  });

  it("is null when either side has no recorded audience", () => {
    expect(audienceSimilarity(null, profile({ "18-24": 50 }))).toBeNull();
    expect(audienceSimilarity(profile({ "18-24": 50 }), null)).toBeNull();
  });

  it("scores identical distributions as fully similar", () => {
    const value = audienceSimilarity(
      profile({ "18-24": 40, "25-34": 60 }),
      profile({ "18-24": 40, "25-34": 60 }),
    );
    expect(value).toBeCloseTo(100, 5);
  });

  it("scores disjoint distributions lower", () => {
    const value = audienceSimilarity(
      profile({ "18-24": 100, "45+": 0 }),
      profile({ "18-24": 0, "45+": 100 }),
    );
    expect(value).toBeLessThan(50);
  });
});
