import { Skeleton } from "@/components/ui/skeleton";

/**
 * The fallback for any page under the product shell that has not been given a
 * closer-fitting one. The nav is in the layout and stays put, so this only
 * ever replaces the content column.
 */
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-[80rem] space-y-10 px-6 py-16">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[13rem] rounded-xl" />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index}>
            <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          </li>
        ))}
      </ul>
    </div>
  );
}
