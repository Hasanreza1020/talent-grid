/**
 * Assembles every computed metric for a set of creators in one pass.
 *
 * Percentile ranks and the agency score are relative measures: they need the
 * peer group, which is every active creator sharing the same primary category
 * and tier. That is why this works on a list rather than on one creator, and
 * why nothing here is computed inline in a component.
 */

import type { DirectoryRow } from "@/lib/db/creators";
import { engagementRate, type EngagementInput } from "./engagement";
import { cpm, costPerEngagement } from "./cost";
import { followerGrowth } from "./growth";
import { percentileRank, MINIMUM_PEER_GROUP } from "./percentile";
import { agencyScore, type AgencyScoreValue, type ScoreComponents } from "./score";
import type { MetricResult } from "./types";
import { noData } from "./types";

export type CreatorMetrics = {
  engagement: MetricResult;
  growth30d: MetricResult;
  consistencyIndex: MetricResult;
  cheapestCpm: MetricResult;
  cheapestCostPerEngagement: MetricResult;
  percentiles: {
    engagement: MetricResult;
    costPerEngagement: MetricResult;
    growth: MetricResult;
    consistency: MetricResult;
    reach: MetricResult;
  };
  score: MetricResult<AgencyScoreValue>;
  /** Size of the peer group used for every percentile above. */
  peerGroupSize: number;
};

export function engagementInputOf(row: DirectoryRow): EngagementInput {
  return {
    avgViews: row.primaryAvgViews,
    avgLikes: row.primaryAvgLikes,
    avgComments: row.primaryAvgComments,
    avgShares: row.primaryAvgShares,
    followers: row.primaryFollowers,
  };
}

/** Peer group key: same primary category and same tier, active creators only. */
function peerKey(row: DirectoryRow): string | null {
  if (row.status !== "active") return null;
  if (!row.primaryCategoryId || !row.tier) return null;
  return `${row.primaryCategoryId}:${row.tier}`;
}

export function computeDirectoryMetrics(
  rows: DirectoryRow[],
): Map<string, CreatorMetrics> {
  // Raw values first, so percentiles can be drawn from them.
  const raw = new Map<
    string,
    {
      engagement: MetricResult;
      growth: MetricResult;
      consistency: MetricResult;
      costPerEngagement: MetricResult;
      cpmResult: MetricResult;
      reach: number | null;
    }
  >();

  for (const row of rows) {
    const engagement = engagementRate(engagementInputOf(row));

    const growth =
      row.primaryFollowers !== null &&
      row.primaryCapturedOn &&
      row.previousFollowers !== null &&
      row.previousCapturedOn
        ? followerGrowth(
            [
              { capturedOn: row.primaryCapturedOn, followers: row.primaryFollowers },
              { capturedOn: row.previousCapturedOn, followers: row.previousFollowers },
            ],
            30,
          )
        : noData(
            "Only one follower snapshot recorded. Trend available after the next update.",
            { "Snapshots on record": row.primaryFollowers === null ? 0 : 1 },
          );

    // The view supplies the mean and population standard deviation, which is
    // all the coefficient of variation needs; the raw sample list is not
    // fetched for a list of hundreds of creators. The value carried forward is
    // the scalar index, because that is what a percentile can be drawn from.
    let consistency: MetricResult;
    if (row.sampleCount >= 3 && row.sampleMeanViews !== null && row.sampleMeanViews > 0) {
      const cv = (row.sampleSdViews ?? 0) / row.sampleMeanViews;
      consistency = {
        value: (row.primaryPostsLast30d ?? 0) / (1 + cv),
        basis:
          `${row.primaryPostsLast30d ?? "No"} posts in the last 30 days, with a ` +
          `view-count coefficient of variation of ${cv.toFixed(2)} across ` +
          `${row.sampleCount} samples. Lower variation is steadier.`,
        inputs: {
          "Posts in last 30 days": row.primaryPostsLast30d,
          "Content samples with views": row.sampleCount,
          "Coefficient of variation": Number(cv.toFixed(3)),
          "Mean sample views": Math.round(row.sampleMeanViews),
        },
      };
    } else {
      consistency = noData(
        `Posting consistency needs at least three content samples with view ` +
          `counts; ${row.sampleCount} recorded.`,
        { "Content samples with views": row.sampleCount },
      );
    }

    raw.set(row.id, {
      engagement,
      growth,
      consistency,
      costPerEngagement: costPerEngagement(row.cheapestRateBdt, engagementInputOf(row)),
      cpmResult: cpm(row.cheapestRateBdt, row.primaryAvgViews),
      reach: row.totalReach,
    });
  }

  // Peer groups.
  const groups = new Map<string, DirectoryRow[]>();
  for (const row of rows) {
    const key = peerKey(row);
    if (!key) continue;
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  const result = new Map<string, CreatorMetrics>();

  for (const row of rows) {
    const own = raw.get(row.id)!;
    const key = peerKey(row);
    const peers = key ? (groups.get(key) ?? []) : [];

    const peerValues = (pick: (id: string) => number | null) =>
      peers.map((peer) => ({ creatorId: peer.id, value: pick(peer.id) }));

    const notRankable = (reason: string) =>
      noData(reason, { "Peers in group": peers.length });

    const rankableReason =
      row.status !== "active"
        ? "Only active creators are ranked."
        : !row.primaryCategoryId
          ? "This creator has no primary category, so there is no peer group."
          : !row.tier
            ? "This creator has no tier yet, because no follower count is recorded."
            : peers.length < MINIMUM_PEER_GROUP
              ? "Not enough peers to rank"
              : null;

    const percentiles = {
      engagement: rankableReason
        ? notRankable(rankableReason)
        : percentileRank(row.id, peerValues((id) => raw.get(id)!.engagement.value)),
      costPerEngagement: rankableReason
        ? notRankable(rankableReason)
        : percentileRank(
            row.id,
            peerValues((id) => raw.get(id)!.costPerEngagement.value),
            { higherIsBetter: false },
          ),
      growth: rankableReason
        ? notRankable(rankableReason)
        : percentileRank(row.id, peerValues((id) => raw.get(id)!.growth.value)),
      consistency: rankableReason
        ? notRankable(rankableReason)
        : percentileRank(row.id, peerValues((id) => raw.get(id)!.consistency.value)),
      reach: rankableReason
        ? notRankable(rankableReason)
        : percentileRank(row.id, peerValues((id) => raw.get(id)!.reach)),
    };

    const components: ScoreComponents = {
      engagementRate: percentiles.engagement.value,
      costPerEngagement: percentiles.costPerEngagement.value,
      growth30d: percentiles.growth.value,
      postingConsistency: percentiles.consistency.value,
      internalRatings:
        row.ratingAverage === null ? null : ((row.ratingAverage - 1) / 4) * 100,
    };

    result.set(row.id, {
      engagement: own.engagement,
      growth30d: own.growth,
      consistencyIndex: own.consistency,
      cheapestCpm: own.cpmResult,
      cheapestCostPerEngagement: own.costPerEngagement,
      percentiles,
      score: agencyScore(components),
      peerGroupSize: peers.length,
    });
  }

  return result;
}
