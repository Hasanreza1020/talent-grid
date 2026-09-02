import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { listDirectory, type DirectoryRow } from "./creators";
import { computeDirectoryMetrics } from "@/lib/metrics/directory";
import { daysSince } from "@/lib/format";
import { PLATFORMS, TIERS, type Platform, type Tier } from "@/lib/types";

export const STALE_REFRESH_DAYS = 60;

export type SparkPoint = { month: string; value: number };

export type OverviewMetric = {
  key: string;
  label: string;
  /** Already rounded. Null when the figure is not on file at all. */
  value: number | null;
  format: "number" | "compact" | "percent";
  /** Change against the previous period, as a percentage. Null when unknown. */
  changePercent: number | null;
  /** Six months of real history, or null when none can be reconstructed. */
  spark: SparkPoint[] | null;
  /** Shown when there is no spark, so the gap reads as a fact not a bug. */
  note?: string;
};

export type HealthRow = {
  key: string;
  label: string;
  tone: "amber" | "red" | "green";
  count: number;
  href: string;
};

export type MoverRow = {
  slug: string;
  name: string;
  metric: string;
  deltaPercent: number;
};

export type RecentRow = {
  slug: string;
  name: string;
  portraitUrl: string | null;
  category: string | null;
  followers: number | null;
  platforms: Platform[];
  addedOn: string;
};

export type Overview = {
  creatorCount: number;
  combinedReach: number | null;
  lastRefresh: string | null;
  /** Portraits for the header band. Real records only, never placeholders. */
  bandPortraits: string[];
  metrics: OverviewMetric[];
  health: { rows: HealthRow[]; complete: number; incomplete: number };
  tiers: { tier: Tier; count: number }[];
  platforms: { platform: Platform; count: number }[];
  growth: SparkPoint[];
  recent: RecentRow[];
  movers: MoverRow[];
};

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** The last `count` months, oldest first, as YYYY-MM keys. */
function recentMonths(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (count - 1 - index), 1);
    return monthKey(date);
  });
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Everything the admin overview renders, computed here rather than in the page.
 *
 * All of it is derived server-side from one read of the directory plus two
 * narrow aggregate queries. The client is never handed the roster to count it.
 *
 * Where a figure has no real history behind it, the series is null and the card
 * says so. Nothing on this screen is back-filled with a plausible-looking line:
 * an admin deciding whether to trust the numbers is exactly the reader who must
 * not be shown an invented one.
 */
export const getOverview = cache(async (): Promise<Overview> => {
  const supabase = await createClient();
  const rows = await listDirectory({ includeArchived: true });
  const active = rows.filter((row) => row.deletedAt === null);

  const [contactCounts, reachHistory] = await Promise.all([
    supabase.from("contacts").select("creator_id"),
    supabase.from("metric_snapshots").select("account_id, captured_on, followers"),
  ]);

  const withContact = new Set(
    (contactCounts.data ?? []).map((contact) => contact.creator_id as string),
  );

  // ---- key metrics ---------------------------------------------------------

  const months = recentMonths(6);
  const addedByMonth = new Map<string, number>(months.map((month) => [month, 0]));
  for (const row of active) {
    const key = monthKey(new Date(row.createdAt));
    if (addedByMonth.has(key)) addedByMonth.set(key, (addedByMonth.get(key) ?? 0) + 1);
  }

  // Cumulative headcount at the end of each of the last six months.
  const cumulative: SparkPoint[] = [];
  for (const month of months) {
    const upTo = active.filter((row) => monthKey(new Date(row.createdAt)) <= month).length;
    cumulative.push({ month, value: upTo });
  }

  const addedSpark: SparkPoint[] = months.map((month) => ({
    month,
    value: addedByMonth.get(month) ?? 0,
  }));

  const thisMonth = addedSpark[addedSpark.length - 1]?.value ?? 0;
  const lastMonth = addedSpark[addedSpark.length - 2]?.value ?? 0;

  const combinedReach = active.reduce<number | null>((sum, row) => {
    if (row.totalReach === null) return sum;
    return (sum ?? 0) + row.totalReach;
  }, null);

  // Reach per month: the latest snapshot per account at or before each month
  // end, summed. Flat where the roster has only been captured once, which is
  // the truth about this data rather than a failure to draw a line.
  const snapshots = (reachHistory.data ?? []) as {
    account_id: string;
    captured_on: string;
    followers: number | null;
  }[];
  const reachSpark: SparkPoint[] = months.map((month) => {
    const latest = new Map<string, { on: string; followers: number }>();
    for (const snap of snapshots) {
      if (snap.followers === null) continue;
      if (snap.captured_on.slice(0, 7) > month) continue;
      const held = latest.get(snap.account_id);
      if (!held || snap.captured_on > held.on) {
        latest.set(snap.account_id, { on: snap.captured_on, followers: snap.followers });
      }
    }
    let total = 0;
    for (const entry of latest.values()) total += entry.followers;
    return { month, value: total };
  });
  const reachHasHistory = reachSpark.some((point) => point.value > 0);
  const previousReach = reachSpark[reachSpark.length - 2]?.value ?? 0;
  const currentReach = reachSpark[reachSpark.length - 1]?.value ?? 0;

  const metricsByCreator = computeDirectoryMetrics(active);
  const engagementRates = active
    .map((row) => metricsByCreator.get(row.id)?.engagement.value ?? null)
    .filter((rate): rate is number => rate !== null);
  const medianEngagement = median(engagementRates);

  const metrics: OverviewMetric[] = [
    {
      key: "creators",
      label: "Total creators",
      value: active.length,
      format: "number",
      changePercent:
        cumulative.length >= 2 && cumulative[0].value > 0
          ? Math.round(
              ((cumulative[cumulative.length - 1].value - cumulative[0].value) /
                cumulative[0].value) *
                1000,
            ) / 10
          : null,
      spark: cumulative,
    },
    {
      key: "reach",
      label: "Combined reach",
      value: combinedReach === null ? null : Math.round(combinedReach),
      format: "compact",
      changePercent:
        reachHasHistory && previousReach > 0
          ? Math.round(((currentReach - previousReach) / previousReach) * 1000) / 10
          : null,
      spark: reachHasHistory ? reachSpark : null,
      note: reachHasHistory
        ? undefined
        : "No follower history yet. A trend appears after the second refresh.",
    },
    {
      key: "engagement",
      label: "Median engagement rate",
      value: medianEngagement === null ? null : Math.round(medianEngagement * 10) / 10,
      format: "percent",
      changePercent: null,
      spark: null,
      note:
        medianEngagement === null
          ? "No likes, comments or shares recorded yet, so there is no rate to take a median of."
          : "Historical engagement is not stored per month, so this figure has no trend line.",
    },
    {
      key: "added",
      label: "Creators added this month",
      value: thisMonth,
      format: "number",
      changePercent:
        lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 1000) / 10 : null,
      spark: addedSpark,
    },
  ];

  // ---- roster health -------------------------------------------------------

  const missingRate = active.filter((row) => row.cheapestRateBdt === null);
  const missingContact = active.filter((row) => !withContact.has(row.id));
  const stale = active.filter((row) => {
    const age = daysSince(row.primaryCapturedOn);
    return age === null || age > STALE_REFRESH_DAYS;
  });
  const complete = active.filter(
    (row) =>
      row.cheapestRateBdt !== null &&
      withContact.has(row.id) &&
      row.portraitUrl !== null &&
      (daysSince(row.primaryCapturedOn) ?? Infinity) <= STALE_REFRESH_DAYS,
  );

  const health = {
    rows: [
      {
        key: "rate",
        label: "Missing rate card",
        tone: "amber" as const,
        count: missingRate.length,
        href: "/creators?view=table&sort=followers",
      },
      {
        key: "contact",
        label: "No contact information",
        tone: "red" as const,
        count: missingContact.length,
        href: "/creators?view=table&sort=followers",
      },
      {
        key: "stale",
        label: `Stats not refreshed in over ${STALE_REFRESH_DAYS} days`,
        tone: "amber" as const,
        count: stale.length,
        href: "/creators?view=table&sort=updated",
      },
      {
        key: "complete",
        label: "Complete profiles",
        tone: "green" as const,
        count: complete.length,
        href: "/creators?view=table",
      },
    ],
    complete: complete.length,
    incomplete: active.length - complete.length,
  };

  // ---- composition ---------------------------------------------------------

  const tiers = TIERS.map((tier) => ({
    tier,
    count: active.filter((row) => row.tier === tier).length,
  })).filter((entry) => entry.count > 0);

  const platforms = PLATFORMS.map((platform) => ({
    platform,
    count: active.filter((row) =>
      row.accounts.some((account) => account.platform === platform),
    ).length,
  }));

  // ---- growth over twelve months ------------------------------------------

  const twelve = recentMonths(12);
  const growth: SparkPoint[] = twelve.map((month) => ({
    month,
    value: active.filter((row) => monthKey(new Date(row.createdAt)) === month).length,
  }));

  // ---- recently added ------------------------------------------------------

  const recent: RecentRow[] = [...active]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((row) => ({
      slug: row.slug,
      name: row.displayName,
      portraitUrl: row.portraitUrl,
      category: row.primaryCategoryName,
      followers: row.primaryFollowers,
      platforms: row.accounts.map((account) => account.platform),
      addedOn: row.createdAt,
    }));

  // ---- needs attention -----------------------------------------------------

  const movers: MoverRow[] = active
    .flatMap((row: DirectoryRow) => {
      if (row.primaryFollowers === null || row.previousFollowers === null) return [];
      if (row.previousFollowers <= 0) return [];
      const delta = ((row.primaryFollowers - row.previousFollowers) / row.previousFollowers) * 100;
      if (Math.abs(delta) < 10) return [];
      return [
        {
          slug: row.slug,
          name: row.displayName,
          metric: "Followers",
          deltaPercent: Math.round(delta * 10) / 10,
        },
      ];
    })
    .sort((a, b) => Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent))
    .slice(0, 5);

  const lastRefresh = active.reduce<string | null>((latest, row) => {
    if (!row.primaryCapturedOn) return latest;
    return latest === null || row.primaryCapturedOn > latest ? row.primaryCapturedOn : latest;
  }, null);

  return {
    creatorCount: active.length,
    combinedReach,
    lastRefresh,
    bandPortraits: active
      .map((row) => row.portraitUrl)
      .filter((url): url is string => url !== null)
      .slice(0, 60),
    metrics,
    health,
    tiers,
    platforms,
    growth,
    recent,
    movers,
  };
});
