import Link from "next/link";
import { listDirectory } from "@/lib/db/creators";
import { listCategoryTree } from "@/lib/db/categories";
import { computeDirectoryMetrics } from "@/lib/metrics/directory";
import { CreatorCard } from "@/components/creator/creator-card";
import { toCardData } from "@/lib/card";
import { PortraitWall } from "@/components/chrome/portrait-wall";
import { HomeSearch } from "@/components/chrome/home-search";
import { SectionHeading } from "@/components/ui-bits";
import { formatCompact, formatNumber, NO_DATA } from "@/lib/format";
import { Portrait } from "@/components/creator/portrait";

export const metadata = { title: "Talent Grid" };

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
    .slice(0, 6)
    .map((entry) => entry.row);

  const suggestionsAreScored = scored.length >= 6;
  const suggestions = suggestionsAreScored
    ? scored
    : [...active].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);

  const totalReach = rows.reduce<number | null>((sum, row) => {
    if (row.totalReach === null) return sum;
    return (sum ?? 0) + row.totalReach;
  }, null);

  const populatedCategories = categories.filter((category) => category.creatorCount > 0);

  return (
    <>
      {/* Hero. The portraits are the product, so they are the backdrop. */}
      <section className="relative overflow-hidden border-b border-hairline">
        <PortraitWall
          creators={rows.slice(0, 18).map((row) => ({
            name: row.displayName,
            portraitUrl: row.portraitUrl,
          }))}
        />
        <div className="relative mx-auto max-w-[46rem] px-6 py-24 text-center sm:py-32">
          <h1 className="font-display text-2xl leading-[1.05] text-ink sm:text-3xl">
            Every creator the agency knows, in one place
          </h1>
          <p className="mx-auto mt-4 max-w-[34rem] text-base text-ink-muted">
            Search {formatNumber(rows.length)} creators by category, reach, engagement and
            rate, then build a client-ready shortlist.
          </p>
          <div className="mx-auto mt-8 max-w-[30rem]">
            <HomeSearch />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[80rem] space-y-16 px-6 py-16">
        {/* Categories */}
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

          {populatedCategories.length === 0 ? (
            <p className="text-sm text-ink-muted">
              No creators are filed under a category yet.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {populatedCategories.map((category) => {
                const representative = rows.find(
                  (row) => row.primaryCategoryId === category.id,
                );
                return (
                  <li key={category.id}>
                    <Link href={`/creators?category=${category.slug}`} className="group block">
                      <Portrait
                        name={representative?.displayName ?? category.name}
                        src={representative?.portraitUrl}
                        sizes="(min-width: 1024px) 400px, 90vw"
                        className="aspect-[4/3]"
                      />
                      <div className="mt-3 flex items-baseline justify-between gap-3">
                        <h3 className="text-base">{category.name}</h3>
                        <span className="numeral text-sm text-ink-muted">
                          {category.creatorCount}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Suggested creators */}
        <section className="space-y-6">
          <SectionHeading>
            {suggestionsAreScored ? "Suggested creators" : "Recently added"}
          </SectionHeading>
          {!suggestionsAreScored ? (
            <p className="-mt-2 text-sm text-ink-muted">
              Fewer than six creators have enough verified data to be scored yet, so these
              are the most recently updated records instead.
            </p>
          ) : null}

          {suggestions.length === 0 ? (
            <p className="text-sm text-ink-muted">No creators yet.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((row) => (
                <li key={row.id}>
                  <CreatorCard
                    data={toCardData(row, metrics.get(row.id)!.engagement)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Stat band */}
        <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard tone="ink" label="Creators on file" value={formatNumber(rows.length)} />
          <StatCard
            tone="brand"
            label="Combined reach"
            value={totalReach === null ? NO_DATA : formatCompact(totalReach)}
            note={
              totalReach === null
                ? undefined
                : "Summed across each creator's recorded accounts."
            }
          />
          <StatCard
            tone="stone"
            label="Categories"
            value={formatNumber(categories.length)}
          />
        </section>
      </div>
    </>
  );
}

function StatCard({
  tone,
  label,
  value,
  note,
}: {
  tone: "ink" | "brand" | "stone";
  label: string;
  value: string;
  note?: string;
}) {
  const palette = {
    ink: "bg-ink text-white",
    brand: "bg-brand text-white",
    stone: "bg-stone text-ink",
  }[tone];

  return (
    <div className={`${palette} flex min-h-[13rem] flex-col justify-between rounded-xl p-6`}>
      <p className="text-sm opacity-80">{label}</p>
      <div>
        <p className="numeral text-3xl leading-none">{value}</p>
        {note ? <p className="mt-3 text-xs opacity-75">{note}</p> : null}
      </div>
    </div>
  );
}
