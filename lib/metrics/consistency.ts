import type { MetricResult } from "./types";
import { noData } from "./types";

export type ConsistencyInput = {
  postsLast30d: number | null;
  /** View counts across recorded content samples. */
  sampleViews: number[];
};

export type ConsistencyValue = {
  postsLast30d: number | null;
  /** Coefficient of variation of sample view counts. Lower is steadier. */
  coefficientOfVariation: number;
  /**
   * Single comparable number, needed because the agency score ranks creators
   * on a percentile of posting consistency and a percentile needs a scalar.
   *
   * The spec defines posting_consistency as two things at once (volume plus
   * steadiness) without saying how to combine them, so they are combined here
   * as volume discounted by variation. Both raw components stay visible in the
   * tooltip so nobody has to trust the combination blindly.
   */
  index: number;
};

function coefficientOfVariation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

/**
 * posts_last_30d plus the coefficient of variation of view counts across
 * recorded content samples. Null when fewer than three samples exist.
 */
export function postingConsistency(input: ConsistencyInput): MetricResult<ConsistencyValue> {
  const inputs: Record<string, number | string | null> = {
    "Posts in last 30 days": input.postsLast30d,
    "Content samples with views": input.sampleViews.length,
  };

  if (input.sampleViews.length < 3) {
    return noData<ConsistencyValue>(
      `Posting consistency needs at least three content samples with view ` +
        `counts; ${input.sampleViews.length} recorded.`,
      inputs,
    );
  }

  const cv = coefficientOfVariation(input.sampleViews);
  const posts = input.postsLast30d ?? 0;

  inputs["Coefficient of variation"] = Number(cv.toFixed(3));
  inputs["Mean sample views"] = Math.round(
    input.sampleViews.reduce((a, b) => a + b, 0) / input.sampleViews.length,
  );

  return {
    value: {
      postsLast30d: input.postsLast30d,
      coefficientOfVariation: cv,
      index: posts / (1 + cv),
    },
    basis:
      `${input.postsLast30d ?? "No"} posts in the last 30 days, with a view-count ` +
      `coefficient of variation of ${cv.toFixed(2)} across ` +
      `${input.sampleViews.length} samples. Lower variation is steadier.`,
    inputs,
  };
}
