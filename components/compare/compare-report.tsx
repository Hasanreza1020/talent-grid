"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AddToShortlist } from "@/components/shortlist/add-to-shortlist";
import {
  FollowersByPlatform,
  PerCreatorBars,
  ScoreBars,
  type CreatorDatum,
  type PlatformDatum,
} from "./compare-charts";
import { formatBdt, formatCompact, formatPercent, initialsOf } from "@/lib/format";
import { PLATFORMS, PLATFORM_LABEL } from "@/lib/types";
import type { CompareSubject } from "@/lib/compare-page/subjects";

/**
 * Fixed colour per creator, assigned once at compare time and used in every
 * chart. Colour is never the only carrier: the report header names each
 * creator against its swatch, and every tooltip repeats the name.
 */
export const SERIES_COLORS = [
  "var(--brand)",
  "#2563EB",
  "#0F766E",
  "#7C3AED",
] as const;

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function CompareReport({
  creators,
  rosterEngagement,
  shortlists,
}: {
  creators: CompareSubject[];
  /** Every engagement rate on file, for the median reference line. */
  rosterEngagement: number[];
  shortlists: { id: string; name: string; clientName: string | null }[];
}) {
  const series = creators.map((creator, index) => ({
    key: creator.id,
    name: creator.name,
    color: SERIES_COLORS[index % SERIES_COLORS.length],
  }));

  const datum = (pick: (creator: CompareSubject) => number | null): CreatorDatum[] =>
    creators.map((creator, index) => ({
      key: creator.id,
      name: creator.name,
      color: SERIES_COLORS[index % SERIES_COLORS.length],
      value: pick(creator),
    }));

  // A platform group is drawn only where at least one of the compared creators
  // is actually on that platform.
  const platformData: PlatformDatum[] = PLATFORMS.filter((platform) =>
    creators.some((creator) =>
      creator.platforms.some(
        (account) => account.platform === platform && account.followers !== null,
      ),
    ),
  ).map((platform) => {
    const point: PlatformDatum = { platform };
    for (const creator of creators) {
      const account = creator.platforms.find((entry) => entry.platform === platform);
      point[creator.id] = account?.followers ?? null;
    }
    return point;
  });

  const engagement = datum((creator) => creator.engagementRate);
  const rates = datum((creator) => creator.ratePerPost);
  const scores = datum((creator) => creator.agencyScore);

  // Skipped outright when any creator has no rate: a cost per engagement chart
  // missing a column invites a comparison that cannot be made.
  const everyRateOnFile = creators.every((creator) => creator.ratePerPost !== null);
  const costPerEngagement = everyRateOnFile ? datum((c) => c.costPerEngagement) : null;

  const slugs = creators.map((creator) => creator.slug).join(",");

  return (
    <section id="compare-report" className="scroll-mt-20 space-y-6 pb-16">
      {/* The header is the legend for every chart below it. */}
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-hairline py-4">
        {creators.map((creator, index) => (
          <li key={creator.id} className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: SERIES_COLORS[index % SERIES_COLORS.length] }}
            />
            <span className="size-8 shrink-0 overflow-hidden rounded-full bg-stone">
              {creator.avatarUrl ? (
                <Image
                  src={creator.avatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  sizes="32px"
                  className="size-full object-cover"
                />
              ) : (
                <span className="flex size-full items-center justify-center font-display text-[10px] text-ink/45">
                  {initialsOf(creator.name)}
                </span>
              )}
            </span>
            <span className="min-w-0">
              <Link
                href={`/creators/${creator.slug}`}
                className="block truncate text-sm hover:underline"
              >
                {creator.name}
              </Link>
              {creator.category ? (
                <span className="block truncate text-xs text-ink-muted">
                  {creator.category}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          className="lg:col-span-2"
          label="Followers across platforms"
          summary={creators
            .map(
              (creator) =>
                `${creator.name}: ${creator.platforms
                  .filter((account) => account.followers !== null)
                  .map(
                    (account) =>
                      `${PLATFORM_LABEL[account.platform]} ${formatCompact(account.followers)}`,
                  )
                  .join(", ") || "no follower counts on file"}`,
            )
            .join(". ")}
        >
          {platformData.length === 0 ? (
            <Absent>No follower counts on file for any of these creators.</Absent>
          ) : (
            <FollowersByPlatform data={platformData} series={series} />
          )}
        </ChartCard>

        <ChartCard
          label="Engagement rate"
          summary={engagement
            .map(
              (entry) =>
                `${entry.name}: ${entry.value === null ? "not on file" : formatPercent(entry.value, 1)}`,
            )
            .join(". ")}
        >
          <PerCreatorBars
            data={engagement}
            format={(value) => formatPercent(value, 1)}
            missingLabel="No engagement data"
            median={median(rosterEngagement)}
          />
        </ChartCard>

        <ChartCard
          label="Rate per post"
          note="The lowest current rate on file for each creator."
          summary={rates
            .map(
              (entry) =>
                `${entry.name}: ${entry.value === null ? "not listed" : formatBdt(entry.value)}`,
            )
            .join(". ")}
        >
          <PerCreatorBars
            data={rates}
            format={(value) => formatBdt(value)}
            missingLabel="Not listed"
          />
        </ChartCard>

        <ChartCard
          label="Agency score"
          tooltip="Grid's internal reliability score, computed from engagement, growth, posting consistency, cost efficiency and internal ratings. A creator missing more than two of those is left unscored rather than scored on what is left."
          summary={scores
            .map(
              (entry) =>
                `${entry.name}: ${entry.value === null ? "not scored" : `${Math.round(entry.value)} out of 100`}`,
            )
            .join(". ")}
        >
          <ScoreBars data={scores} />
        </ChartCard>

        {costPerEngagement ? (
          <ChartCard
            label="Cost per engagement"
            note="Lower is better."
            summary={costPerEngagement
              .map(
                (entry) =>
                  `${entry.name}: ${entry.value === null ? "not available" : `${entry.value.toFixed(2)} BDT`}`,
              )
              .join(". ")}
          >
            <PerCreatorBars
              data={costPerEngagement}
              format={(value) => `BDT ${value.toFixed(2)}`}
              missingLabel="No interactions recorded"
            />
          </ChartCard>
        ) : (
          <ChartCard label="Cost per engagement">
            <Absent>
              Not shown. At least one of these creators has no rate on file, and a cost
              comparison missing a column invites a conclusion the data cannot support.
            </Absent>
          </ChartCard>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-6">
        <Button asChild variant="outline" size="sm">
          <a href={`/api/compare/pdf?ids=${slugs}`}>Export as PDF</a>
        </Button>
        <AddToShortlist
          creatorIds={creators.map((creator) => creator.id)}
          shortlists={shortlists}
          label="Save comparison"
        />
      </div>
    </section>
  );
}

function Absent({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-sm text-ink-muted">{children}</p>;
}

function ChartCard({
  label,
  note,
  tooltip,
  summary,
  className,
  children,
}: {
  label: string;
  note?: string;
  tooltip?: string;
  /** Read out to screen readers in place of the chart. */
  summary?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-xl border border-hairline bg-surface p-6 ${className ?? ""}`}>
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm text-ink-muted">{label}</h3>
        {tooltip ? (
          <Tooltip>
            <TooltipTrigger
              className="text-xs text-ink-muted underline decoration-dotted underline-offset-2"
              aria-label={`What ${label.toLowerCase()} means`}
            >
              ?
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {note ? <p className="mt-1 text-xs text-ink-muted">{note}</p> : null}
      {summary ? <p className="sr-only">{summary}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
}
