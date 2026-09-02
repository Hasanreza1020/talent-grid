import Link from "next/link";
import { getCompareData } from "@/lib/db/compare";
import { listDirectory } from "@/lib/db/creators";
import { listShortlists } from "@/lib/db/shortlists";
import { computeDirectoryMetrics } from "@/lib/metrics/directory";
import { CompareView } from "@/components/compare/compare-view";
import { CompareHydrator } from "@/components/compare/compare-hydrator";
import { EmptyState } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { COMPARE_MIN } from "@/components/compare/compare-context";

export const metadata = { title: "Compare — Grid" };

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const params = await searchParams;
  const slugs = (params.ids ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (slugs.length < COMPARE_MIN) {
    return (
      <div className="mx-auto max-w-[80rem] px-6 py-16">
        <h1 className="font-display text-xl">Compare</h1>
        <div className="mt-6">
          <EmptyState
            action={
              <Button asChild size="sm">
                <Link href="/creators">Browse creators</Link>
              </Button>
            }
          >
            Pick at least two creators to compare. Tick the box on any creator card, or
            open a creator and choose add to compare.
          </EmptyState>
        </div>
      </div>
    );
  }

  const [creators, allRows, shortlists] = await Promise.all([
    getCompareData(slugs),
    listDirectory(),
    listShortlists(),
  ]);

  if (creators.length < COMPARE_MIN) {
    return (
      <div className="mx-auto max-w-[80rem] px-6 py-16">
        <h1 className="font-display text-xl">Compare</h1>
        <div className="mt-6">
          <EmptyState
            action={
              <Button asChild size="sm">
                <Link href="/creators">Browse creators</Link>
              </Button>
            }
          >
            Some of the creators in this link could not be found. They may have been
            archived since the link was made.
          </EmptyState>
        </div>
      </div>
    );
  }

  const metrics = computeDirectoryMetrics(allRows);

  return (
    <>
      {/* Loading /compare?ids=... directly hydrates the tray selection. */}
      <CompareHydrator slugs={creators.map((creator) => creator.slug)} />
      <CompareView
        creators={creators}
        metricsEntries={creators.flatMap((creator) => {
          const own = metrics.get(creator.id);
          // Defensive: a creator archived between the two reads would have no
          // metrics. Dropping the entry degrades to "not ranked" rather than
          // throwing on a page the team relies on.
          return own ? [[creator.id, own] as [string, typeof own]] : [];
        })}
        shortlists={shortlists.map((list) => ({
          id: list.id,
          name: list.name,
          clientName: list.clientName,
        }))}
      />
    </>
  );
}
