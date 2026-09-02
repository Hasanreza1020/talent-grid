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
 * The blend the pool is ordered by before the model sees it.
 *
 * Engagement is weighted above the agency score because it is measured rather
 * than assigned. Reach is in the blend, on a log scale, because for most of
 * this roster it is the only figure on file — without it every candidate
 * scores zero and the pool arrives in arbitrary order. Log rather than linear,
 * so one mega account does not flatten everything beneath it.
 */
export function poolScore(candidate: Candidate): number {
  const engagement = (candidate.engagementRate ?? 0) * 10;
  const agency = (candidate.agencyScore ?? 0) * 0.4;
  const reach =
    candidate.totalReach && candidate.totalReach > 0
      ? Math.log10(candidate.totalReach) * 2
      : 0;
  return engagement + agency + reach;
}

/** The rates that exist. A missing rate is unknown, never zero. */
export function pricedRates(candidates: { ratePerPost: number | null }[]): number[] {
  return candidates
    .map((entry) => entry.ratePerPost)
    .filter((rate): rate is number => rate !== null);
}

export function computeTotals(picks: Pick[], budget: number, rosterEngagement: number[]): PlanTotals {
  // Only priced creators contribute to spend. One with no rate on file costs
  // an unknown amount, not nothing, so the count is reported beside the total
  // rather than folded into it.
  const rates = pricedRates(picks.map((pick) => pick.candidate));
  const spend = rates.reduce((sum, rate) => sum + rate, 0);

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
    pricedCount: rates.length,
    unpricedCount: picks.length - rates.length,
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
  const spend = pricedRates(picks.map((pick) => pick.candidate)).reduce((a, b) => a + b, 0);
  if (spend <= budget || picks.length === 0) return { picks, bench, swapped: null };

  // Only a priced pick can be swapped out for a saving, and only a priced
  // bench candidate can come in: trading a known cost for an unknown one moves
  // the plan without telling anyone which way.
  let dearestIndex = -1;
  picks.forEach((pick, index) => {
    const rate = pick.candidate.ratePerPost;
    if (rate === null) return;
    if (dearestIndex === -1 || rate > (picks[dearestIndex].candidate.ratePerPost ?? 0)) {
      dearestIndex = index;
    }
  });
  if (dearestIndex === -1) return { picks, bench, swapped: null };

  const dearest = picks[dearestIndex];
  const dearestRate = dearest.candidate.ratePerPost as number;

  const cheaper = bench
    .filter(
      (candidate): candidate is Candidate & { ratePerPost: number } =>
        candidate.ratePerPost !== null && candidate.ratePerPost < dearestRate,
    )
    .sort((a, b) => b.ratePerPost - a.ratePerPost)[0];

  if (!cheaper) return { picks, bench, swapped: null };

  const nextPicks = picks.map((pick, index) =>
    index === dearestIndex
      ? {
          candidate: cheaper,
          role: pick.role,
          reason: "Swapped in to bring the plan inside budget.",
          context: "",
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
        ? {
            candidate: incoming,
            role: pick.role,
            reason: "Chosen by hand from the shortlist.",
            context: "",
          }
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

  // Priced creators first, best blend down, taking what the budget covers.
  for (const candidate of ordered) {
    if (chosen.length >= creatorCount) break;
    if (candidate.ratePerPost === null) continue;
    if (spend + candidate.ratePerPost > budget) continue;
    chosen.push(candidate);
    spend += candidate.ratePerPost;
  }

  // Then the unpriced, best blend down. They cannot be costed, so they cannot
  // break the budget either; the plan reports how many of them it contains.
  if (chosen.length < creatorCount) {
    for (const candidate of ordered) {
      if (chosen.length >= creatorCount) break;
      if (candidate.ratePerPost !== null) continue;
      chosen.push(candidate);
    }
  }

  // Still short: the budget is too tight even for the cheapest, so show them
  // and let the overage be visible rather than returning a shorter list.
  if (chosen.length < creatorCount) {
    const rest = ordered
      .filter((candidate) => !chosen.some((entry) => entry.id === candidate.id))
      .sort((a, b) => (a.ratePerPost ?? Infinity) - (b.ratePerPost ?? Infinity));
    chosen.push(...rest.slice(0, creatorCount - chosen.length));
  }

  return chosen;
}
