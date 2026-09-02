import { getCreators } from "@/lib/compare-page/subjects";
import { listShortlists } from "@/lib/db/shortlists";
import { CompareBuilder } from "@/components/compare/compare-builder";

export const metadata = { title: "Compare — Grid" };

/**
 * The page loads the whole candidate list once and hands it to the client.
 *
 * The picker filters in memory against it, which is what makes the modal feel
 * instant, and is affordable because this is an internal tool over a directory
 * of hundreds rather than a public search over millions. Slots are hydrated
 * from `?ids=` on the client, so the page itself needs no knowledge of the
 * selection.
 */
export default async function ComparePage() {
  const [candidates, shortlists] = await Promise.all([getCreators(), listShortlists()]);

  const facets = {
    categories: [
      ...new Map(
        candidates
          .filter((creator) => creator.categorySlug && creator.category)
          .map((creator) => [
            creator.categorySlug!,
            { slug: creator.categorySlug!, name: creator.category! },
          ]),
      ).values(),
    ].sort((a, b) => a.name.localeCompare(b.name)),
    cities: [
      ...new Set(
        candidates
          .map((creator) => creator.city)
          .filter((city): city is string => city !== null),
      ),
    ].sort(),
  };

  // Every engagement rate on file, for the median line on that chart. Drawn
  // from the whole roster rather than the four on screen, which is what makes
  // it a benchmark rather than a restatement of the bars beside it.
  const rosterEngagement = candidates
    .map((creator) => creator.engagementRate)
    .filter((rate): rate is number => rate !== null);

  return (
    <CompareBuilder
      candidates={candidates}
      facets={facets}
      rosterEngagement={rosterEngagement}
      shortlists={shortlists.map((list) => ({
        id: list.id,
        name: list.name,
        clientName: list.clientName,
      }))}
    />
  );
}
