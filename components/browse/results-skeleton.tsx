import { Skeleton } from "@/components/ui/skeleton";
import type { BrowseFilters } from "@/lib/browse";

/** One card: the portrait, then the two lines that sit under it. */
function CardSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[4/5] w-full rounded-xl" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-hairline py-3">
      <Skeleton className="size-9 shrink-0 rounded-md" />
      <Skeleton className="h-3 w-40" />
      <Skeleton className="ml-auto h-3 w-16" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

/**
 * What stands in for the result set while the new one is being read.
 *
 * The header row is not drawn here. The sort and view controls sit in the page
 * shell, outside this boundary, so that they keep the choice the click just
 * made instead of being replaced by a fresh copy reading the old URL.
 */
export function ResultsSkeleton({ view }: { view: BrowseFilters["view"] }) {
  return (
    <>
      {view === "table" ? (
        <div className="pt-6">
          {Array.from({ length: 10 }, (_, index) => (
            <RowSkeleton key={index} />
          ))}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-8 pt-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <li key={index}>
              <CardSkeleton />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** The rail, on a first load only. Filter changes never replace it. */
export function FilterRailSkeleton() {
  return (
    <aside className="w-full shrink-0 lg:w-[280px]" aria-hidden>
      <div className="space-y-6 py-6">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 5 }, (_, group) => (
          <div key={group} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            {Array.from({ length: 4 }, (_, row) => (
              <Skeleton key={row} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
