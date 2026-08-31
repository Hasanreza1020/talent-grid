import type { MetricResult } from "./types";
import { noData } from "./types";

/**
 * Weights are fixed by the spec. Any component that is null is dropped and the
 * remaining weights are renormalised. More than two null components means the
 * score is not computed at all rather than computed from a thin remainder.
 */
export const SCORE_WEIGHTS = {
  engagementRate: 0.35,
  costPerEngagement: 0.25,
  growth30d: 0.15,
  postingConsistency: 0.15,
  internalRatings: 0.1,
} as const;

export type ScoreComponentKey = keyof typeof SCORE_WEIGHTS;

export const SCORE_COMPONENT_LABEL: Record<ScoreComponentKey, string> = {
  engagementRate: "Engagement rate",
  costPerEngagement: "Cost per engagement",
  growth30d: "30-day growth",
  postingConsistency: "Posting consistency",
  internalRatings: "Internal ratings",
};

export const MAX_NULL_COMPONENTS = 2;

/**
 * Percentile values, 0 to 100, one per component. Cost per engagement is
 * passed already inverted by the caller (cheaper ranks higher), and internal
 * ratings are the average of the three 1-to-5 dimensions rescaled to 0-100.
 */
export type ScoreComponents = Record<ScoreComponentKey, number | null>;

export type ScoreBreakdownRow = {
  key: ScoreComponentKey;
  label: string;
  percentile: number | null;
  /** Weight actually applied after renormalisation. */
  weight: number;
  contribution: number | null;
};

export type AgencyScoreValue = {
  score: number;
  breakdown: ScoreBreakdownRow[];
  droppedComponents: ScoreComponentKey[];
};

export function agencyScore(components: ScoreComponents): MetricResult<AgencyScoreValue> {
  const keys = Object.keys(SCORE_WEIGHTS) as ScoreComponentKey[];
  const present = keys.filter((k) => components[k] !== null);
  const dropped = keys.filter((k) => components[k] === null);

  const inputs: Record<string, number | string | null> = {};
  for (const key of keys) {
    inputs[SCORE_COMPONENT_LABEL[key]] = components[key];
  }

  if (dropped.length > MAX_NULL_COMPONENTS) {
    return noData<AgencyScoreValue>("Insufficient data to score", inputs);
  }

  const weightTotal = present.reduce((sum, k) => sum + SCORE_WEIGHTS[k], 0);
  if (weightTotal === 0) {
    return noData<AgencyScoreValue>("Insufficient data to score", inputs);
  }

  const breakdown: ScoreBreakdownRow[] = keys.map((key) => {
    const percentile = components[key];
    const weight = percentile === null ? 0 : SCORE_WEIGHTS[key] / weightTotal;
    return {
      key,
      label: SCORE_COMPONENT_LABEL[key],
      percentile,
      weight,
      contribution: percentile === null ? null : percentile * weight,
    };
  });

  const score = breakdown.reduce((sum, row) => sum + (row.contribution ?? 0), 0);

  return {
    value: { score, breakdown, droppedComponents: dropped },
    basis: dropped.length
      ? `Computed from ${present.length} of 5 components; ` +
        `${dropped.map((k) => SCORE_COMPONENT_LABEL[k].toLowerCase()).join(" and ")} ` +
        `not available, so the remaining weights were renormalised.`
      : "Computed from all five components at their specified weights.",
    inputs,
  };
}

/** Average of the three 1-to-5 internal rating dimensions, rescaled to 0-100. */
export function internalRatingScore(
  notes: {
    professionalism: number | null;
    responsiveness: number | null;
    punctuality: number | null;
  }[],
): number | null {
  const values = notes.flatMap((n) =>
    [n.professionalism, n.responsiveness, n.punctuality].filter(
      (v): v is number => v !== null,
    ),
  );
  if (values.length === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return ((mean - 1) / 4) * 100;
}
