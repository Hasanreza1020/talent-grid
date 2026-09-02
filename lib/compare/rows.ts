import type { CompareCreator } from "../db/compare";
import type { Deliverable, Platform, RatePlatform } from "../types";
import type { CompareCell, CompareRow } from "./types";

export function accountFor(creator: CompareCreator, platform: Platform | null) {
  if (!platform) return creator.accounts.find((account) => account.isPrimary) ?? null;
  return creator.accounts.find((account) => account.platform === platform) ?? null;
}

export function engagementInputFor(creator: CompareCreator, platform: Platform | null) {
  const account = accountFor(creator, platform);
  return {
    avgViews: account?.latest?.avgViews ?? null,
    avgLikes: account?.latest?.avgLikes ?? null,
    avgComments: account?.latest?.avgComments ?? null,
    avgShares: account?.latest?.avgShares ?? null,
    followers: account?.latest?.followers ?? null,
  };
}

export function rateFor(
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

export function buildRow(
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
