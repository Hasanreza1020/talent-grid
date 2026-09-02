import { Skeleton } from "@/components/ui/skeleton";

/** The detail hero, at the size it will be, so the page does not jump. */
export default function CreatorLoading() {
  return (
    <div className="mx-auto max-w-[80rem] px-6 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
        <Skeleton className="aspect-[4/5] w-full rounded-xl" />

        <div className="min-w-0 space-y-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-6 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-[220px] w-full rounded-xl" />
      </div>
    </div>
  );
}
