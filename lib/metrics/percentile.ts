import type { MetricResult } from "./types";
import { noData } from "./types";

export const MINIMUM_PEER_GROUP = 5;

export type PeerValue = { creatorId: string; value: number | null };

export type PercentileOptions = {
  /** false when a lower raw value is better, e.g. cost per mille. */
  higherIsBetter?: boolean;
};

/**
 * The creator's rank among all active creators sharing the same primary
 * category and the same tier, expressed as a percentile.
 *
 * The caller is responsible for having already narrowed `peers` to that group.
 * A peer group smaller than five returns null, because a percentile drawn from
 * four people says more about the sample than about the creator.
 */
export function percentileRank(
  creatorId: string,
  peers: PeerValue[],
  options: PercentileOptions = {},
): MetricResult {
  const higherIsBetter = options.higherIsBetter ?? true;
  const withValues = peers.filter((p): p is { creatorId: string; value: number } => p.value !== null);

  const inputs: Record<string, number | string | null> = {
    "Peers in group": peers.length,
    "Peers with a value": withValues.length,
    Direction: higherIsBetter ? "Higher is better" : "Lower is better",
  };

  if (peers.length < MINIMUM_PEER_GROUP) {
    return noData("Not enough peers to rank", inputs);
  }

  const own = withValues.find((p) => p.creatorId === creatorId);
  if (!own) {
    return noData("This creator has no value recorded for the metric.", inputs);
  }
  if (withValues.length < MINIMUM_PEER_GROUP) {
    return noData("Not enough peers to rank", inputs);
  }

  // Fraction of peers this creator equals or beats, counting ties as half so
  // that identical values do not all report as the top of the group.
  const better = withValues.filter((p) =>
    higherIsBetter ? p.value < own.value : p.value > own.value,
  ).length;
  const equal = withValues.filter(
    (p) => p.value === own.value && p.creatorId !== creatorId,
  ).length;

  const percentile = ((better + equal / 2) / (withValues.length - 1 || 1)) * 100;

  inputs["Own value"] = own.value;
  inputs["Peers beaten"] = better;
  inputs["Peers tied"] = equal;

  return {
    value: Math.max(0, Math.min(100, percentile)),
    basis:
      `Ranked against ${withValues.length} creators in the same primary category ` +
      `and tier. ${higherIsBetter ? "Higher" : "Lower"} is better.`,
    inputs,
  };
}

/** Plain sentence used beneath the benchmark radar chart. */
export function percentileSentence(label: string, result: MetricResult): string {
  if (result.value === null) return `${label}: ${result.basis}`;
  const rounded = Math.round(result.value);
  return `Ranks above ${rounded}% of peers on ${label.toLowerCase()}.`;
}
