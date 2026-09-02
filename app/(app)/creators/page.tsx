import { Suspense } from "react";
import Link from "next/link";
import { listDirectory } from "@/lib/db/creators";
import { listCategories, listTags } from "@/lib/db/categories";
import { getCurrentUser, isEditor } from "@/lib/db/user";
import { computeDirectoryMetrics } from "@/lib/metrics/directory";
import {
  applyFilters,
  findBlockingFilter,
  parseFilters,
  filtersToQuery,
  clearFilter,
  sortRows,
  SORTS,
  SORT_LABEL,
  type BrowseFilters,
} from "@/lib/browse";
import { CreatorCard } from "@/components/creator/creator-card";
import { toCardData } from "@/lib/card";
import { CreatorTable } from "@/components/browse/creator-table";
import { FilterRail } from "@/components/browse/filter-rail";
import { ViewControls } from "@/components/browse/view-controls";
import { FilterRailSkeleton, ResultsSkeleton } from "@/components/browse/results-skeleton";
import { BrowseProvider } from "@/components/browse/browse-context";
import { CountFrame, ResultsFrame } from "@/components/browse/results-frame";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

export const metadata = { title: "Creators — Grid" };

/**
 * The page itself awaits nothing but the query string, so the frame is on
 * screen before any database read starts. The two halves then arrive
 * independently.
 *
 * The Suspense boundaries below cover the first paint, where there is nothing
 * on screen yet and the server is streaming. Filter clicks are the other case:
 * there the previous results are already rendered, and React will not replace
 * visible content with a fallback mid-transition, so ResultsFrame does that
 * swap explicitly from the pending flag.
 */
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const key = filtersToQuery(filters);

  return (
    <BrowseProvider>
      <div className="mx-auto flex max-w-[80rem] flex-col gap-6 px-6 lg:flex-row">
        {/* The rail is never swapped for a skeleton on a filter click. Its
            facets do not depend on the filters, and blanking the control you
            just used is the opposite of responsive. */}
        <Suspense fallback={<FilterRailSkeleton />}>
          <FilterRailSection />
        </Suspense>

        <div className="min-w-0 flex-1 py-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline pb-4">
            <h1 className="text-lg">
              <CountFrame>
                <Suspense key={`count-${key}`} fallback={<Skeleton className="h-5 w-32" />}>
                  <ResultCount filters={filters} />
                </Suspense>
              </CountFrame>
            </h1>
            <ViewControls sorts={SORTS} sortLabels={SORT_LABEL} />
          </div>

          <ResultsFrame>
            <Suspense key={key} fallback={<ResultsSkeleton view={filters.view} />}>
              <Results filters={filters} />
            </Suspense>
          </ResultsFrame>
        </div>
      </div>
    </BrowseProvider>
  );
}

async function FilterRailSection() {
  const [rows, categories, tags, user] = await Promise.all([
    listDirectory(),
    listCategories(),
    listTags(),
    getCurrentUser(),
  ]);

  const categoriesById = new Map(categories.map((category) => [category.id, category]));

  return (
    <FilterRail
      canSeeRates={isEditor(user)}
      facets={{
        categories: categories.map((category) => ({
          slug: category.slug,
          name: category.name,
          parentName: category.parentId
            ? (categoriesById.get(category.parentId)?.name ?? null)
            : null,
        })),
        tags: tags.map((tag) => ({ slug: tag.slug, label: tag.label })),
        cities: [
          ...new Set(
            rows.map((row) => row.city).filter((city): city is string => city !== null),
          ),
        ].sort(),
      }}
    />
  );
}

/** The one number in the header row that cannot be known before the query. */
async function ResultCount({ filters }: { filters: BrowseFilters }) {
  const rows = await listDirectory();
  const metrics = computeDirectoryMetrics(rows);
  const results = applyFilters(rows, filters, { metrics });

  return (
    <>
      {formatNumber(results.length)} creator{results.length === 1 ? "" : "s"}
      {results.length !== rows.length ? (
        <span className="text-ink-muted"> of {formatNumber(rows.length)}</span>
      ) : null}
    </>
  );
}

async function Results({ filters }: { filters: BrowseFilters }) {
  const [rows, user] = await Promise.all([listDirectory(), getCurrentUser()]);

  const metrics = computeDirectoryMetrics(rows);
  const context = { metrics };

  const filtered = applyFilters(rows, filters, context);
  const results = sortRows(filtered, filters.sort, context);

  const blocking =
    results.length === 0 ? findBlockingFilter(rows, filters, context) : null;

  return (
    <>
      {results.length === 0 ? (
        <div className="py-16 text-center">
          {blocking ? (
            <>
              <p className="text-sm text-ink-muted">
                Nothing matches. The {blocking.label.toLowerCase()} filter is what is
                excluding everything: clearing it would show{" "}
                {formatNumber(blocking.wouldMatch)} creator
                {blocking.wouldMatch === 1 ? "" : "s"}.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link
                  href={`/creators?${filtersToQuery(clearFilter(filters, blocking.key))}`}
                >
                  Clear the {blocking.label.toLowerCase()} filter
                </Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-muted">
                Nothing matches this combination of filters. No single filter explains
                it, so more than one will need to change.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link href="/creators">Clear all filters</Link>
              </Button>
            </>
          )}
        </div>
      ) : filters.view === "table" ? (
        <CreatorTable
          rows={results.map((row) => ({
            slug: row.slug,
            displayName: row.displayName,
            handle: row.primaryHandle,
            platform: row.primaryPlatform,
            category: row.primaryCategoryName,
            tier: row.tier,
            followers: row.primaryFollowers,
            totalReach: row.totalReach,
            engagementRate: metrics.get(row.id)!.engagement.value,
            engagementQualifier: metrics.get(row.id)!.engagement.qualifier,
            score: metrics.get(row.id)!.score.value?.score ?? null,
            cheapestRate: row.cheapestRateBdt,
            city: row.city,
            dataConfidence: row.dataConfidence,
          }))}
          canSeeRates={isEditor(user)}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-8 pt-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((row) => (
            <li key={row.id}>
              <CreatorCard data={toCardData(row, metrics.get(row.id)!.engagement)} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
