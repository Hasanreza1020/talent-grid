/**
 * Builds the comparison table.
 *
 * Everything here is pure: creators plus options in, row groups out. The rules
 * that matter are the ones that stop the table misleading someone in a client
 * meeting, so they are stated explicitly rather than left implicit in JSX:
 *
 *  - A missing value is "No data". Never zero, never a dash, and the row is
 *    never dropped.
 *  - A row with two or more missing values gets no best-value marker at all,
 *    because "best of the two we happen to know" is a misleading claim.
 *  - Direction matters: higher wins on reach, engagement, growth and score;
 *    lower wins on rate, cost per mille and cost per engagement.
 */

import type { CompareCreator } from "./db/compare";
import type { CreatorMetrics } from "./metrics/directory";
import { engagementRate, engagementRateLabel } from "./metrics/engagement";
import { cpm, costPerEngagement } from "./metrics/cost";
import { followerGrowth } from "./metrics/growth";
import type { MetricResult } from "./metrics/types";
import { noData } from "./metrics/types";
import {
  formatBdt,
  formatCompact,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  NO_DATA,
} from "./format";
import {
  DELIVERABLE_LABEL,
  PLATFORM_LABEL,
  TIER_LABEL,
  LANGUAGE_LABEL,
  STATUS_LABEL,
  type Deliverable,
  type Platform,
  type RatePlatform,
} from "./types";

export type CompareOptions = {
  /** Restricts every metric to one platform, when the user picks one. */
  platform: Platform | null;
  deliverable: Deliverable | null;
  /** Percentile mode makes creators of different sizes comparable. */
  normalised: boolean;
};

export type CompareCell = {
  creatorId: string;
  display: string;
  /** Null means no data. Used for the best-value comparison. */
  value: number | null;
  result?: MetricResult;
  isBest?: boolean;
};

export type CompareRow = {
  key: string;
  label: string;
  direction: "higher" | "lower" | null;
  cells: CompareCell[];
  allMissing: boolean;
  /** Set when marking was suppressed, so the UI can explain why. */
  markingSuppressed: boolean;
};

export type CompareGroup = { key: string; label: string; rows: CompareRow[] };

function accountFor(creator: CompareCreator, platform: Platform | null) {
  if (!platform) return creator.accounts.find((account) => account.isPrimary) ?? null;
  return creator.accounts.find((account) => account.platform === platform) ?? null;
}

function engagementInputFor(creator: CompareCreator, platform: Platform | null) {
  const account = accountFor(creator, platform);
  return {
    avgViews: account?.latest?.avgViews ?? null,
    avgLikes: account?.latest?.avgLikes ?? null,
    avgComments: account?.latest?.avgComments ?? null,
    avgShares: account?.latest?.avgShares ?? null,
    followers: account?.latest?.followers ?? null,
  };
}

function rateFor(
  creator: CompareCreator,
  deliverable: Deliverable | null,
  platform: Platform | null,
): number | null {
  if (!deliverable) {
    const prices = creator.rates.map((rate) => rate.priceBdt);
    return prices.length ? Math.min(...prices) : null;
  }
  const wanted: RatePlatform[] = platform ? [platform, "cross_platform"] : [];
  const matches = creator.rates.filter(
    (rate) =>
      rate.deliverable === deliverable &&
      (wanted.length === 0 || wanted.includes(rate.platform)),
  );
  return matches.length ? Math.min(...matches.map((rate) => rate.priceBdt)) : null;
}

/**
 * Estimated similarity between two audience profiles.
 *
 * This is not measured follower overlap, which would need follower-level data
 * no platform exposes to us. It is the cosine similarity of the recorded age
 * distributions and city shares, and the UI labels it as an estimate so nobody
 * repeats it to a client as a measured figure.
 */
export function audienceSimilarity(
  a: CompareCreator["audience"],
  b: CompareCreator["audience"],
): number | null {
  if (!a || !b) return null;

  const vectors = (
    left: Record<string, number> | null,
    right: Record<string, number> | null,
  ): [number[], number[]] | null => {
    if (!left || !right) return null;
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])];
    if (keys.length === 0) return null;
    return [keys.map((k) => Number(left[k] ?? 0)), keys.map((k) => Number(right[k] ?? 0))];
  };

  const cityMap = (profile: CompareCreator["audience"]) =>
    profile?.topCities
      ? Object.fromEntries(profile.topCities.map((entry) => [entry.city, entry.percent]))
      : null;

  const parts = [
    vectors(a.ageBrackets, b.ageBrackets),
    vectors(cityMap(a), cityMap(b)),
  ].filter((part): part is [number[], number[]] => part !== null);

  if (parts.length === 0) return null;

  const similarities = parts.map(([left, right]) => {
    const dot = left.reduce((sum, value, index) => sum + value * right[index], 0);
    const magnitudeLeft = Math.sqrt(left.reduce((sum, value) => sum + value * value, 0));
    const magnitudeRight = Math.sqrt(right.reduce((sum, value) => sum + value * value, 0));
    if (magnitudeLeft === 0 || magnitudeRight === 0) return 0;
    return dot / (magnitudeLeft * magnitudeRight);
  });

  return (similarities.reduce((a2, b2) => a2 + b2, 0) / similarities.length) * 100;
}

function buildRow(
  key: string,
  label: string,
  direction: "higher" | "lower" | null,
  cells: CompareCell[],
): CompareRow {
  const missing = cells.filter((cell) => cell.value === null).length;
  const allMissing = missing === cells.length;

  // Two or more unknowns makes any "best" claim misleading.
  const markingSuppressed = direction === null || missing >= 2;

  if (!markingSuppressed) {
    const known = cells.filter((cell): cell is CompareCell & { value: number } => cell.value !== null);
    if (known.length > 1) {
      const best =
        direction === "higher"
          ? Math.max(...known.map((cell) => cell.value))
          : Math.min(...known.map((cell) => cell.value));
      for (const cell of cells) {
        if (cell.value === best) cell.isBest = true;
      }
    }
  }

  return { key, label, direction, cells, allMissing, markingSuppressed };
}

export function buildComparison(
  creators: CompareCreator[],
  metrics: Map<string, CreatorMetrics>,
  options: CompareOptions,
): CompareGroup[] {
  const { platform, deliverable, normalised } = options;

  const textRow = (key: string, label: string, pick: (c: CompareCreator) => string | null) =>
    buildRow(
      key,
      label,
      null,
      creators.map((creator) => ({
        creatorId: creator.id,
        display: pick(creator) ?? NO_DATA,
        value: null,
      })),
    );

  const numericRow = (
    key: string,
    label: string,
    direction: "higher" | "lower",
    pick: (creator: CompareCreator) => MetricResult,
    format: (value: number) => string,
    normalisedPick?: (creator: CompareCreator) => MetricResult,
  ) => {
    const useNormalised = normalised && normalisedPick !== undefined;
    return buildRow(
      key,
      label,
      // In percentile mode a high percentile always wins, whichever way the
      // underlying raw metric runs.
      useNormalised ? "higher" : direction,
      creators.map((creator) => {
        const result = useNormalised ? normalisedPick(creator) : pick(creator);
        return {
          creatorId: creator.id,
          value: result.value,
          display:
            result.value === null
              ? NO_DATA
              : useNormalised
                ? `${Math.round(result.value)}th percentile`
                : format(result.value),
          result,
        };
      }),
    );
  };

  const plain = (value: number | null, basis: string): MetricResult => ({
    value,
    basis,
    inputs: {},
  });

  const identity: CompareRow[] = [
    textRow("handle", "Primary handle", (creator) => {
      const account = accountFor(creator, platform);
      return account?.handle ? `@${account.handle}` : null;
    }),
    textRow("category", "Category", (creator) => creator.primaryCategoryName),
    textRow("tier", "Tier", (creator) => (creator.tier ? TIER_LABEL[creator.tier] : null)),
    textRow("city", "City", (creator) => creator.city),
    textRow("language", "Language", (creator) => LANGUAGE_LABEL[creator.primaryLanguage]),
    textRow("status", "Status", (creator) => STATUS_LABEL[creator.status]),
    textRow("conflicts", "Open exclusivity", (creator) => {
      const open = creator.conflicts.filter(
        (conflict) =>
          conflict.exclusiveUntil !== null &&
          new Date(conflict.exclusiveUntil) >= new Date(new Date().toDateString()),
      );
      if (open.length === 0) return "None on file";
      return open.map((conflict) => `${conflict.brandName} to ${conflict.exclusiveUntil}`).join("; ");
    }),
  ];

  const reach: CompareRow[] = [
    ...(["facebook", "instagram", "tiktok", "youtube"] as Platform[])
      .filter((entry) =>
        creators.some((creator) =>
          creator.accounts.some((account) => account.platform === entry),
        ),
      )
      .map((entry) =>
        buildRow(
          `followers-${entry}`,
          `${PLATFORM_LABEL[entry]} followers`,
          "higher",
          creators.map((creator) => {
            const account = creator.accounts.find((a) => a.platform === entry);
            const value = account?.latest?.followers ?? null;
            return {
              creatorId: creator.id,
              value,
              display: value === null ? NO_DATA : formatCompact(value),
            };
          }),
        ),
      ),
    buildRow(
      "total-reach",
      "Total reach",
      "higher",
      creators.map((creator) => ({
        creatorId: creator.id,
        value: creator.totalReach,
        display: creator.totalReach === null ? NO_DATA : formatCompact(creator.totalReach),
      })),
    ),
    buildRow(
      "platform-count",
      "Active platforms",
      "higher",
      creators.map((creator) => ({
        creatorId: creator.id,
        value: creator.accountCount,
        display: formatNumber(creator.accountCount),
      })),
    ),
  ];

  const engagement: CompareRow[] = [
    numericRow(
      "engagement",
      // If any creator's rate had to fall back to followers, the row is not a
      // like-for-like comparison and the label has to say so rather than
      // taking its wording from whoever happens to be in the first column.
      creators.some(
        (creator) =>
          engagementRate(engagementInputFor(creator, platform)).qualifier === "by_followers",
      )
        ? creators.every(
            (creator) =>
              engagementRate(engagementInputFor(creator, platform)).qualifier ===
              "by_followers",
          )
          ? "ER by followers"
          : "Engagement rate (mixed basis)"
        : "Engagement rate",
      "higher",
      (creator) => engagementRate(engagementInputFor(creator, platform)),
      (value) => formatPercent(value),
      (creator) => metrics.get(creator.id)?.percentiles.engagement ?? noData("Not ranked."),
    ),
    buildRow(
      "avg-views",
      "Average views",
      "higher",
      creators.map((creator) => {
        const value = accountFor(creator, platform)?.latest?.avgViews ?? null;
        return {
          creatorId: creator.id,
          value,
          display: value === null ? NO_DATA : formatCompact(value),
        };
      }),
    ),
    buildRow(
      "avg-likes",
      "Average likes",
      "higher",
      creators.map((creator) => {
        const value = accountFor(creator, platform)?.latest?.avgLikes ?? null;
        return {
          creatorId: creator.id,
          value,
          display: value === null ? NO_DATA : formatCompact(value),
        };
      }),
    ),
    buildRow(
      "avg-comments",
      "Average comments",
      "higher",
      creators.map((creator) => {
        const value = accountFor(creator, platform)?.latest?.avgComments ?? null;
        return {
          creatorId: creator.id,
          value,
          display: value === null ? NO_DATA : formatCompact(value),
        };
      }),
    ),
    buildRow(
      "posts-30d",
      "Posts in last 30 days",
      "higher",
      creators.map((creator) => {
        const value = accountFor(creator, platform)?.latest?.postsLast30d ?? null;
        return {
          creatorId: creator.id,
          value,
          display: value === null ? NO_DATA : formatNumber(value),
        };
      }),
    ),
  ];

  const growth: CompareRow[] = [30, 90].map((window) =>
    numericRow(
      `growth-${window}`,
      `${window}-day growth`,
      "higher",
      (creator) => followerGrowth(creator.primarySnapshots, window),
      (value) => formatSignedPercent(value),
      window === 30
        ? (creator) => metrics.get(creator.id)?.percentiles.growth ?? noData("Not ranked.")
        : undefined,
    ),
  );

  const cost: CompareRow[] = [
    buildRow(
      "cheapest-rate",
      "Cheapest rate",
      "lower",
      creators.map((creator) => {
        const value = rateFor(creator, null, null);
        return {
          creatorId: creator.id,
          value,
          display: value === null ? "No rate on file" : formatBdt(value),
        };
      }),
    ),
    buildRow(
      "deliverable-rate",
      deliverable ? `Rate for ${DELIVERABLE_LABEL[deliverable].toLowerCase()}` : "Rate for selected deliverable",
      "lower",
      creators.map((creator) => {
        const value = rateFor(creator, deliverable, platform);
        return {
          creatorId: creator.id,
          value,
          display: value === null ? "No rate on file" : formatBdt(value),
        };
      }),
    ),
    numericRow(
      "cpm",
      "Cost per mille",
      "lower",
      (creator) =>
        cpm(
          rateFor(creator, deliverable, platform),
          accountFor(creator, platform)?.latest?.avgViews ?? null,
        ),
      (value) => formatBdt(Math.round(value)),
    ),
    numericRow(
      "cpe",
      "Cost per engagement",
      "lower",
      (creator) =>
        costPerEngagement(
          rateFor(creator, deliverable, platform),
          engagementInputFor(creator, platform),
        ),
      (value) => formatBdt(Math.round(value)),
      (creator) =>
        metrics.get(creator.id)?.percentiles.costPerEngagement ?? noData("Not ranked."),
    ),
  ];

  const audience: CompareRow[] = [
    textRow("dominant-age", "Dominant age bracket", (creator) => {
      const brackets = creator.audience?.ageBrackets;
      if (!brackets || Object.keys(brackets).length === 0) return null;
      const [bracket, percent] = Object.entries(brackets).sort(
        (a, b) => Number(b[1]) - Number(a[1]),
      )[0];
      return `${bracket} at ${Number(percent)}%`;
    }),
    textRow("gender-split", "Gender split", (creator) => {
      const split = creator.audience?.genderSplit;
      if (!split || Object.keys(split).length === 0) return null;
      return Object.entries(split)
        .map(([gender, percent]) => `${gender} ${Number(percent)}%`)
        .join(", ");
    }),
    textRow("top-city", "Top city", (creator) => {
      const city = creator.audience?.topCities?.[0];
      return city ? `${city.city} at ${city.percent}%` : null;
    }),
    buildRow(
      "audience-overlap",
      "Estimated audience similarity",
      null,
      creators.map((creator) => {
        const others = creators.filter((other) => other.id !== creator.id);
        const scores = others
          .map((other) => audienceSimilarity(creator.audience, other.audience))
          .filter((score): score is number => score !== null);
        const value = scores.length
          ? scores.reduce((a, b) => a + b, 0) / scores.length
          : null;
        return {
          creatorId: creator.id,
          value,
          display: value === null ? NO_DATA : `${Math.round(value)}% similar`,
        };
      }),
    ),
  ];

  const trackRecord: CompareRow[] = [
    buildRow(
      "campaign-count",
      "Past campaigns",
      "higher",
      creators.map((creator) => ({
        creatorId: creator.id,
        value: creator.collaborationCount,
        display: formatNumber(creator.collaborationCount),
      })),
    ),
    buildRow(
      "delivered-er",
      "Average delivered engagement",
      "higher",
      creators.map((creator) => ({
        creatorId: creator.id,
        value: creator.averageDeliveredEngagement,
        display:
          creator.averageDeliveredEngagement === null
            ? NO_DATA
            : formatPercent(creator.averageDeliveredEngagement),
      })),
    ),
    buildRow(
      "internal-rating",
      "Internal rating",
      "higher",
      creators.map((creator) => ({
        creatorId: creator.id,
        value: creator.ratingAverageVisible,
        display:
          creator.ratingAverageVisible === null
            ? NO_DATA
            : `${creator.ratingAverageVisible.toFixed(1)} of 5`,
      })),
    ),
  ];

  const score: CompareRow[] = [
    buildRow(
      "agency-score",
      "Agency score",
      "higher",
      creators.map((creator) => {
        const result = metrics.get(creator.id)?.score;
        const value = result?.value?.score ?? null;
        return {
          creatorId: creator.id,
          value,
          display: value === null ? (result?.basis ?? NO_DATA) : String(Math.round(value)),
          result: result
            ? plain(value, result.basis)
            : undefined,
        };
      }),
    ),
  ];

  return [
    { key: "identity", label: "Identity", rows: identity },
    { key: "reach", label: "Reach", rows: reach },
    { key: "engagement", label: "Engagement", rows: engagement },
    { key: "growth", label: "Growth", rows: growth },
    { key: "cost", label: "Cost", rows: cost },
    { key: "audience", label: "Audience", rows: audience },
    { key: "track", label: "Track record", rows: trackRecord },
    { key: "score", label: "Score", rows: score },
  ];
}

/**
 * A short summary in plain sentences, computed from the table itself. No
 * language model is involved: it reads the winning cells and says what they
 * are, with a caveat when the data behind them is thin.
 */
export function summariseComparison(
  creators: CompareCreator[],
  groups: CompareGroup[],
): string[] {
  const nameOf = (id: string) =>
    creators.find((creator) => creator.id === id)?.displayName ?? "Unknown";

  const findRow = (key: string) =>
    groups.flatMap((group) => group.rows).find((row) => row.key === key);

  const sentences: string[] = [];

  const leaderOf = (key: string) => {
    const row = findRow(key);
    if (!row || row.markingSuppressed) return null;
    const best = row.cells.find((cell) => cell.isBest);
    return best ? { name: nameOf(best.creatorId), display: best.display, row } : null;
  };

  const reach = leaderOf("total-reach");
  if (reach) {
    sentences.push(`${reach.name} has the largest total reach, at ${reach.display}.`);
  }

  const engagement = leaderOf("engagement");
  if (engagement) {
    sentences.push(
      `${engagement.name} leads on engagement, at ${engagement.display}.`,
    );
  }

  const cost = leaderOf("cpe") ?? leaderOf("cheapest-rate");
  if (cost) {
    sentences.push(
      `${cost.name} is the most cost efficient, at ${cost.display} ` +
        `${cost.row.key === "cpe" ? "per engagement" : "for their cheapest deliverable"}.`,
    );
  }

  const score = leaderOf("agency-score");
  if (score) {
    sentences.push(`${score.name} has the highest agency score, at ${score.display}.`);
  }

  // The caveat. Thin data is the normal state right after an import, and the
  // summary has to say so rather than sounding more confident than it is.
  const allRows = groups.flatMap((group) => group.rows);
  const suppressed = allRows.filter((row) => row.direction !== null && row.markingSuppressed);
  if (suppressed.length > 0) {
    sentences.push(
      `Read this with care: ${suppressed.length} of ${allRows.filter((row) => row.direction !== null).length} ` +
        `comparable rows had too many missing values to name a winner, so they are ` +
        `left unmarked.`,
    );
  }

  if (sentences.length === 0) {
    sentences.push(
      "There is not enough recorded data on these creators to compare them yet. " +
        "Adding engagement figures and rate cards is what makes this table useful.",
    );
  }

  return sentences;
}
