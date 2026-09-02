import Link from "next/link";
import { listDirectory } from "@/lib/db/creators";
import { listCategoryTree } from "@/lib/db/categories";
import { computeDirectoryMetrics } from "@/lib/metrics/directory";
import { CreatorCard } from "@/components/creator/creator-card";
import { toCardData } from "@/lib/card";
import { PortraitWall } from "@/components/chrome/portrait-wall";
import { HomeSearch } from "@/components/chrome/home-search";
import { CategoryIcon } from "@/components/platform-icon";
import { ByTheNumbers } from "@/components/home/by-the-numbers";
import { SectionHeading } from "@/components/ui-bits";
import { formatCompact, formatNumber, NO_DATA } from "@/lib/format";
import { PLATFORMS, PLATFORM_LABEL, TIERS, TIER_LABEL, TIER_RANGE_LABEL } from "@/lib/types";

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

  // By the numbers -----------------------------------------------------------

  const tierData = TIERS.map((tier) => ({
    tier: TIER_LABEL[tier],
    range: TIER_RANGE_LABEL[tier],
    creators: rows.filter((row) => row.tier === tier).length,
  }));

  const platformData = PLATFORMS.map((platform) => {
    const on = rows.filter((row) =>
      row.accounts.some((account) => account.platform === platform),
    );
    const reach = on.reduce<number | null>((sum, row) => {
      const followers = row.accounts.find((a) => a.platform === platform)?.latest?.followers;
      if (followers === null || followers === undefined) return sum;
      return (sum ?? 0) + followers;
    }, null);
    return {
      platform,
      label: PLATFORM_LABEL[platform],
      creators: on.length,
      reach,
    };
  }).filter((entry) => entry.creators > 0);

  const completeness = [
    {
      label: "Has a portrait",
      done: rows.filter((row) => row.portraitUrl !== null).length,
      total: rows.length,
    },
    {
      label: "Has engagement data",
      done: rows.filter(
        (row) =>
          row.primaryAvgLikes !== null ||
          row.primaryAvgComments !== null ||
          row.primaryAvgShares !== null,
      ).length,
      total: rows.length,
    },
    {
      label: "Has a rate on file",
      done: rows.filter((row) => row.cheapestRateBdt !== null).length,
      total: rows.length,
    },
    {
      label: "Verified against the platform",
      done: rows.filter((row) => row.dataConfidence !== "unverified").length,
      total: rows.length,
    },
  ];

  return (
    <>
      {/* Hero. The portraits are the product, so they are the backdrop. */}
      <section className="relative overflow-hidden border-b border-hairline">
        <PortraitWall
          creators={[...rows]
            .sort((a, b) => Number(b.portraitUrl !== null) - Number(a.portraitUrl !== null))
            .slice(0, 20)
            .map((row) => ({
              slug: row.slug,
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
        {/* Categories: a compact strip of destinations, not a photo gallery. */}
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
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {populatedCategories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/creators?category=${category.slug}`}
                    className="group flex h-full flex-col justify-between gap-6 rounded-xl border border-hairline bg-surface p-5 transition-colors hover:border-ink/25"
                  >
                    <CategoryIcon
                      slug={category.slug}
                      className="size-8 text-ink-muted transition-colors group-hover:text-ink"
                    />
                    <span>
                      <span className="block text-lg leading-tight">{category.name}</span>
                      <span className="numeral mt-1 block text-sm text-ink-muted">
                        {formatNumber(category.creatorCount)} creators
                      </span>
                    </span>
                  </Link>
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
            note={`${populatedCategories.length} of them have creators filed under them.`}
          />
        </section>

        {/* By the numbers */}
        <section className="space-y-6">
          <SectionHeading>By the numbers</SectionHeading>
          <ByTheNumbers
            tiers={tierData}
            platforms={platformData}
            completeness={completeness}
          />
        </section>

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
            <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {suggestions.map((row) => (
                <li key={row.id}>
                  <CreatorCard data={toCardData(row, metrics.get(row.id)!.engagement)} />
                </li>
              ))}
            </ul>
          )}
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
