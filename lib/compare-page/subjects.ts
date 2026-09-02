import "server-only";

import { listDirectory } from "@/lib/db/creators";
import { applyFilters } from "@/lib/browse";
import { computeDirectoryMetrics } from "@/lib/metrics/directory";
import { EMPTY_FILTERS, type BrowseFilters } from "@/lib/browse";
import type { Platform, Tier } from "@/lib/types";

/**
 * What the compare screen renders one creator from.
 *
 * A projection of DirectoryRow plus the computed metrics, flattened so that no
 * component on this page reaches into the database shape or recomputes a
 * formula. Every numeric field is nullable and stays null when the figure is
 * not on file: the charts render that as an absence, never as a zero bar.
 */
export type CompareSubject = {
  id: string;
  slug: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  category: string | null;
  categorySlug: string | null;
  tier: Tier | null;
  city: string | null;
  platforms: { platform: Platform; followers: number | null }[];
  totalFollowers: number | null;
  /** Percent, as the rest of the product stores it: 3.8 means 3.8%. */
  engagementRate: number | null;
  /** Why the engagement rate is what it is, or why it is missing. */
  engagementBasis: string;
  /** The lowest current rate on file, in BDT. */
  ratePerPost: number | null;
  agencyScore: number | null;
  costPerEngagement: number | null;
};

/**
 * The one fetch boundary for this screen.
 *
 * Filtering runs through `applyFilters`, the same pure function the browse page
 * uses, so the picker's filter semantics cannot drift from the ones that are
 * already under test. Metrics are computed over the whole directory rather than
 * the filtered slice, because the agency score and every percentile are
 * relative to a peer group and would change meaning if the peer group were a
 * search result.
 */
export async function getCreators(
  filters: BrowseFilters = EMPTY_FILTERS,
): Promise<CompareSubject[]> {
  const rows = await listDirectory();
  const metrics = computeDirectoryMetrics(rows);
  const matching = applyFilters(rows, filters, { metrics });

  return matching.map((row) => {
    const own = metrics.get(row.id);

    return {
      id: row.id,
      slug: row.slug,
      name: row.displayName,
      handle: row.primaryHandle,
      avatarUrl: row.portraitUrl,
      category: row.primaryCategoryName,
      categorySlug: row.primaryCategorySlug,
      tier: row.tier,
      city: row.city,
      platforms: row.accounts.map((account) => ({
        platform: account.platform,
        followers: account.latest?.followers ?? null,
      })),
      totalFollowers: row.totalReach,
      engagementRate: own?.engagement.value ?? null,
      engagementBasis: own?.engagement.basis ?? "Not computed.",
      ratePerPost: row.cheapestRateBdt,
      agencyScore: own?.score.value?.score ?? null,
      costPerEngagement: own?.cheapestCostPerEngagement.value ?? null,
    };
  });
}
