import type { Candidate, Pick, PlanTotals } from "./types";

/**
 * Every figure the strategiser shows is computed here, from the database rows,
 * in application code.
 *
 * The language model is never asked for a number and its output is never
 * summed. It picks ids and writes sentences; the arithmetic is ours. A model
 * that is confidently wrong about a budget is worse than no strategiser at
 * all, because the mistake looks like a calculation.
 */

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * The blend the pool is ordered by before the model sees it, so a ranking call
 * that does nothing clever still returns something defensible. Engagement is
 * weighted above the agency score because it is measured rather than assigned;
 * a creator with neither sorts last rather than being dropped.
 */
export function poolScore(candidate: Candidate): number {
  const engagement = candidate.engagementRate ?? 0;
  const agency = candidate.agencyScore ?? 0;
  return engagement * 10 + agency * 0.4;
}

export function computeTotals(picks: Pick[], budget: number, rosterEngagement: number[]): PlanTotals {
  const spend = picks.reduce((sum, pick) => sum + pick.candidate.ratePerPost, 0);

  const reaches = picks
    .map((pick) => pick.candidate.totalReach)
    .filter((reach): reach is number => reach !== null);
  // Null rather than zero when nothing is on file: a plan with no reach figure
  // has not reached nobody, it has told us nothing.
  const combinedReach = reaches.length > 0 ? reaches.reduce((a, b) => a + b, 0) : null;

  const engagements = picks
    .map((pick) => pick.candidate.engagementRate)
    .filter((rate): rate is number => rate !== null);

  return {
    spend: Math.round(spend),
    budget: Math.round(budget),
    remaining: Math.round(budget - spend),
    combinedReach: combinedReach === null ? null : Math.round(combinedReach),
    costPerThousandReach:
      combinedReach === null || combinedReach <= 0
        ? null
        : Math.round((spend / (combinedReach / 1000)) * 100) / 100,
    averageEngagement:
      engagements.length === 0
        ? null
        : Math.round((engagements.reduce((a, b) => a + b, 0) / engagements.length) * 10) / 10,
    rosterMedianEngagement: (() => {
      const value = median(rosterEngagement);
      return value === null ? null : Math.round(value * 10) / 10;
    })(),
  };
}

/**
 * Swap the dearest pick for the closest cheaper candidate on the bench, once.
 *
 * Deliberately one step at a time rather than a solver: the caller presses the
 * button again if it is still over, and can see what changed each time. A
 * routine that silently rebuilt the whole shortlist to hit a number would
 * produce a plan nobody chose.
 */
export function fitToBudget(
  picks: Pick[],
  bench: Candidate[],
  budget: number,
): { picks: Pick[]; bench: Candidate[]; swapped: { out: string; in: string } | null } {
  const spend = picks.reduce((sum, pick) => sum + pick.candidate.ratePerPost, 0);
  if (spend <= budget || picks.length === 0) return { picks, bench, swapped: null };

  const dearestIndex = picks.reduce(
    (best, pick, index) =>
      pick.candidate.ratePerPost > picks[best].candidate.ratePerPost ? index : best,
    0,
  );
  const dearest = picks[dearestIndex];

  const cheaper = bench
    .filter((candidate) => candidate.ratePerPost < dearest.candidate.ratePerPost)
    .sort((a, b) => b.ratePerPost - a.ratePerPost)[0];

  if (!cheaper) return { picks, bench, swapped: null };

  const nextPicks = picks.map((pick, index) =>
    index === dearestIndex
      ? {
          candidate: cheaper,
          role: pick.role,
          reason: "Swapped in to bring the plan inside budget.",
        }
      : pick,
  );
  const nextBench = [
    ...bench.filter((candidate) => candidate.id !== cheaper.id),
    dearest.candidate,
  ].sort((a, b) => poolScore(b) - poolScore(a));

  return {
    picks: nextPicks,
    bench: nextBench,
    swapped: { out: dearest.candidate.name, in: cheaper.name },
  };
}

/** Replace one pick with a named bench candidate, keeping its role. */
export function swapPick(
  picks: Pick[],
  bench: Candidate[],
  outId: string,
  inId: string,
): { picks: Pick[]; bench: Candidate[] } {
  const incoming = bench.find((candidate) => candidate.id === inId);
  const outgoing = picks.find((pick) => pick.candidate.id === outId);
  if (!incoming || !outgoing) return { picks, bench };

  return {
    picks: picks.map((pick) =>
      pick.candidate.id === outId
        ? { candidate: incoming, role: pick.role, reason: "Chosen by hand from the shortlist." }
        : pick,
    ),
    bench: [
      ...bench.filter((candidate) => candidate.id !== inId),
      outgoing.candidate,
    ].sort((a, b) => poolScore(b) - poolScore(a)),
  };
}

/**
 * The ranking used when the model is unavailable: best blend first, taking
 * only what the budget covers. No explanations, because there is nothing
 * honest to say about a choice an algorithm made on price alone.
 */
export function plainRanking(
  pool: Candidate[],
  creatorCount: number,
  budget: number,
): Candidate[] {
  const ordered = [...pool].sort((a, b) => poolScore(b) - poolScore(a));
  const chosen: Candidate[] = [];
  let spend = 0;

  for (const candidate of ordered) {
    if (chosen.length >= creatorCount) break;
    if (spend + candidate.ratePerPost > budget) continue;
    chosen.push(candidate);
    spend += candidate.ratePerPost;
  }

  // Budget too tight for a full set: fill the rest with the cheapest available
  // so the user sees the overage rather than a short list with no explanation.
  if (chosen.length < creatorCount) {
    const rest = ordered
      .filter((candidate) => !chosen.some((entry) => entry.id === candidate.id))
      .sort((a, b) => a.ratePerPost - b.ratePerPost);
    chosen.push(...rest.slice(0, creatorCount - chosen.length));
  }

  return chosen;
}
