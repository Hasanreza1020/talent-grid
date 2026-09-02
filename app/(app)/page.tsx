import Link from "next/link";
import { listDirectory } from "@/lib/db/creators";
import { listCategoryTree } from "@/lib/db/categories";
import { computeDirectoryMetrics } from "@/lib/metrics/directory";
import { CreatorCard } from "@/components/creator/creator-card";
import { toCardData } from "@/lib/card";
import { PortraitWall } from "@/components/chrome/portrait-wall";
import { HomePrompt } from "@/components/home/home-prompt";
import { FeatureShowcase } from "@/components/home/feature-showcase";
import { CategoryGrid } from "@/components/home/category-grid";
import { buildCategoryCards } from "@/lib/home/categories";
import { SectionHeading } from "@/components/ui-bits";
import { formatCompact, formatNumber, NO_DATA } from "@/lib/format";


export const metadata = { title: "Grid" };

export default async function HomePage() {
  const [rows, categories] = await Promise.all([listDirectory(), listCategoryTree()]);
  const metrics = computeDirectoryMetrics(rows);

  const active = rows.filter((row) => row.status === "active");

  // Highest agency score among active, non-unverified creators. When fewer
  // than six qualify, the section becomes "Recently added" rather than being
  // padded with creators that did not earn the slot.
  const scored = active
    .filter((row) => row.dataConfidence !== "unverified")
    .map((row) => ({ row, score: metrics.get(row.id)?.score.value?.score ?? null }))
    .filter((entry): entry is { row: (typeof active)[number]; score: number } => entry.score !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((entry) => entry.row);

  const suggestionsAreScored = scored.length >= 8;
  const suggestions = suggestionsAreScored
    ? scored
    : [...active]
        // Without scores to rank on, the largest accounts are the most useful
        // thing to put in front of someone opening the tool.
        .sort((a, b) => (b.totalReach ?? -1) - (a.totalReach ?? -1))
        .slice(0, 8);

  const totalReach = rows.reduce<number | null>((sum, row) => {
    if (row.totalReach === null) return sum;
    return (sum ?? 0) + row.totalReach;
  }, null);

  const populatedCategories = categories
    .filter((category) => category.creatorCount > 0)
    .sort((a, b) => b.creatorCount - a.creatorCount);

  const categoryCards = buildCategoryCards(rows, categories);

  // Eight per category. A creator counts towards a top-level category if they
  // are filed under it or under one of its children, which is the rule the
  // category counts already use. Ranked the way the suggestions are: by agency
  // score where one can be computed, by reach where one cannot, so a category
  // with no engagement data still leads with its largest accounts.
  const categorySections = populatedCategories
    .map((category) => ({
      category,
      creators: active
        .filter((row) =>
          row.categories.some(
            (ref) => ref.id === category.id || ref.parentId === category.id,
          ),
        )
        .sort((a, b) => {
          const scoreA = metrics.get(a.id)?.score.value?.score ?? null;
          const scoreB = metrics.get(b.id)?.score.value?.score ?? null;
          if (scoreA !== null && scoreB !== null && scoreA !== scoreB) {
            return scoreB - scoreA;
          }
          if (scoreA !== null && scoreB === null) return -1;
          if (scoreA === null && scoreB !== null) return 1;
          return (b.totalReach ?? -1) - (a.totalReach ?? -1);
        })
        .slice(0, 8),
    }))
    .filter((section) => section.creators.length > 0);

  // The proof strip. Every figure is read from the roster as it stands.
  const showcaseStats = [
    { value: formatNumber(rows.length), label: "creators on file" },
    {
      value: totalReach === null ? NO_DATA : formatCompact(totalReach),
      label: "combined reach",
    },
    { value: formatNumber(categories.length), label: "categories" },
  ];

  return (
    <>
      {/* Hero. The portraits are the product, so they are the backdrop. */}
      {/* Dark, like the strategiser, so following the call to action does not
          flash from cream to black. */}
      <section className="sg-page relative isolate overflow-hidden">
        <PortraitWall
          dim
          creators={[...rows]
            .sort((a, b) => Number(b.portraitUrl !== null) - Number(a.portraitUrl !== null))
            .slice(0, 20)
            .map((row) => ({
              slug: row.slug,
              name: row.displayName,
              portraitUrl: row.portraitUrl,
            }))}
        />
        {/* Glass needs something to blur. The collage is that something, held
            soft and behind a heavy scrim so the placeholder keeps its contrast
            against every part of it. */}
        <div className="sg-collage-scrim" />
        <div className="sg-ambient" />
        <div className="sg-grain" />

        <div className="relative mx-auto max-w-[52rem] px-6 py-20 sm:py-28">
          <HomePrompt rosterSize={rows.length} />
        </div>
      </section>

      <div className="mx-auto max-w-[80rem] space-y-16 px-6 py-16">
        {/* Categories, as a wall of the people filed under them. */}
        <section className="space-y-6">
          <SectionHeading
            action={
              <Link href="/creators" className="text-sm text-ink-muted hover:text-ink">
                Browse all
              </Link>
            }
          >
            Categories
          </SectionHeading>

          {categoryCards.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No creators are filed under a category yet.
            </p>
          ) : (
            <CategoryGrid cards={categoryCards} />
          )}
        </section>

        {/* What Grid is, in the slot the internal charts used to occupy. */}
        <FeatureShowcase stats={showcaseStats} />

        {/* Suggested creators */}
        <section className="space-y-6">
          <SectionHeading
            action={
              <Link href="/creators" className="text-sm text-ink-muted hover:text-ink">
                See all
              </Link>
            }
          >
            {suggestionsAreScored ? "Suggested creators" : "Biggest reach"}
          </SectionHeading>
          {!suggestionsAreScored ? (
            <p className="-mt-2 text-sm text-ink-muted">
              Not enough creators have verified engagement data to be scored yet, so
              these are the largest accounts on file instead.
            </p>
          ) : null}

          {suggestions.length === 0 ? (
            <p className="text-sm text-ink-muted">No creators yet.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {suggestions.map((row) => (
                <li key={row.id}>
                  <CreatorCard data={toCardData(row, metrics.get(row.id)!.engagement)} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Eight from every category that has anyone in it. This is the part of
            the page an account manager scrolls: the categories strip above is
            for going somewhere, this is for seeing who is there. */}
        {categorySections.map((section) => (
          <section key={section.category.id} className="space-y-6">
            <SectionHeading
              action={
                <Link
                  href={`/creators?category=${section.category.slug}`}
                  className="text-sm text-ink-muted hover:text-ink"
                >
                  See all {formatNumber(section.category.creatorCount)}
                </Link>
              }
            >
              {section.category.name}
            </SectionHeading>
            <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.creators.map((row) => (
                <li key={row.id}>
                  <CreatorCard data={toCardData(row, metrics.get(row.id)!.engagement)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
