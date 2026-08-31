import type { MetricResult } from "./types";
import { noData } from "./types";

export type EngagementInput = {
  avgViews: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  avgShares: number | null;
  followers: number | null;
};

/**
 * Total interactions per post. Null components are not counted as zero; the
 * basis string names exactly which components went into the sum so a partial
 * figure is never mistaken for a complete one.
 */
export function totalInteractions(input: EngagementInput): {
  value: number | null;
  counted: string[];
  missing: string[];
} {
  const parts: [string, number | null][] = [
    ["likes", input.avgLikes],
    ["comments", input.avgComments],
    ["shares", input.avgShares],
  ];
  const counted = parts.filter(([, v]) => v !== null);
  const missing = parts.filter(([, v]) => v === null).map(([k]) => k);

  if (counted.length === 0) {
    return { value: null, counted: [], missing: missing };
  }
  return {
    value: counted.reduce((sum, [, v]) => sum + (v as number), 0),
    counted: counted.map(([k]) => k),
    missing,
  };
}

/**
 * (avg_likes + avg_comments + avg_shares) / avg_views * 100.
 *
 * Falls back to dividing by followers only when avg_views is null, and flags
 * that result as "ER by followers" because the two are not comparable.
 */
export function engagementRate(input: EngagementInput): MetricResult {
  const interactions = totalInteractions(input);

  const inputs: Record<string, number | string | null> = {
    "Average likes": input.avgLikes,
    "Average comments": input.avgComments,
    "Average shares": input.avgShares,
    "Average views": input.avgViews,
    Followers: input.followers,
  };

  if (interactions.value === null) {
    return noData("No likes, comments or shares recorded.", inputs);
  }

  const partialNote = interactions.missing.length
    ? ` Counted ${interactions.counted.join(" and ")} only; ` +
      `${interactions.missing.join(" and ")} not recorded.`
    : "";

  if (input.avgViews !== null && input.avgViews > 0) {
    return {
      value: (interactions.value / input.avgViews) * 100,
      basis:
        `${interactions.value.toLocaleString()} interactions per post divided by ` +
        `${input.avgViews.toLocaleString()} average views.${partialNote}`,
      inputs,
    };
  }

  if (input.followers !== null && input.followers > 0) {
    return {
      value: (interactions.value / input.followers) * 100,
      basis:
        `No average views recorded, so this is measured against ` +
        `${input.followers.toLocaleString()} followers instead. Not comparable ` +
        `with a view-based engagement rate.${partialNote}`,
      inputs,
      qualifier: "by_followers",
    };
  }

  return noData("Neither average views nor a follower count is recorded.", inputs);
}

/** The label the UI must use, given the qualifier. */
export function engagementRateLabel(result: MetricResult): string {
  return result.qualifier === "by_followers" ? "ER by followers" : "Engagement rate";
}
