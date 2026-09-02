import { FilterRailSkeleton, ResultsSkeleton } from "@/components/browse/results-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Arriving at browse from another page. Filter changes never reach here — they
 * are handled by the Suspense boundaries inside the page, which keep the rail
 * and the view controls live. This is the colder case, where nothing on screen
 * belongs to this route yet, so the header row is drawn too.
 */
export default function BrowseLoading() {
  return (
    <div className="mx-auto flex max-w-[80rem] flex-col gap-6 px-6 lg:flex-row">
      <FilterRailSkeleton />
      <div className="min-w-0 flex-1 py-6">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-hairline pb-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-[260px]" />
        </div>
        <ResultsSkeleton view="grid" />
      </div>
    </div>
  );
}
