import type { MetricResult } from "./types";
import { noData } from "./types";
import { totalInteractions, type EngagementInput } from "./engagement";

/** cost per mille = rate for the deliverable / avg_views * 1000, in BDT. */
export function cpm(rateBdt: number | null, avgViews: number | null): MetricResult {
  const inputs = { "Rate (BDT)": rateBdt, "Average views": avgViews };

  if (rateBdt === null) return noData("No rate on file for this deliverable.", inputs);
  if (avgViews === null) return noData("No average views recorded.", inputs);
  if (avgViews === 0) return noData("Average views is zero, so cost per mille is undefined.", inputs);

  return {
    value: (rateBdt / avgViews) * 1000,
    basis:
      `BDT ${rateBdt.toLocaleString()} divided by ${avgViews.toLocaleString()} ` +
      `average views, per thousand views.`,
    inputs,
  };
}

/** cost per engagement = current rate / (likes + comments + shares), in BDT. */
export function costPerEngagement(
  rateBdt: number | null,
  engagement: EngagementInput,
): MetricResult {
  const interactions = totalInteractions(engagement);
  const inputs: Record<string, number | string | null> = {
    "Rate (BDT)": rateBdt,
    "Average likes": engagement.avgLikes,
    "Average comments": engagement.avgComments,
    "Average shares": engagement.avgShares,
  };

  if (rateBdt === null) return noData("No rate on file for this deliverable.", inputs);
  if (interactions.value === null) {
    return noData("No likes, comments or shares recorded.", inputs);
  }
  if (interactions.value === 0) {
    return noData("Recorded interactions total zero, so cost per engagement is undefined.", inputs);
  }

  const partialNote = interactions.missing.length
    ? ` Counted ${interactions.counted.join(" and ")} only.`
    : "";

  return {
    value: rateBdt / interactions.value,
    basis:
      `BDT ${rateBdt.toLocaleString()} divided by ` +
      `${interactions.value.toLocaleString()} interactions per post.${partialNote}`,
    inputs,
  };
}
