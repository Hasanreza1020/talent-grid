"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AddToShortlist } from "@/components/shortlist/add-to-shortlist";
import {
  DotPlot,
  FollowersByPlatform,
  HorizontalBars,
  type CreatorDatum,
  type PlatformDatum,
} from "./compare-charts";
import { comparisonSentence, costPerThousandReach } from "@/lib/compare-page/summary";
import { formatBdt, formatCompact, formatPercent } from "@/lib/format";
import { PLATFORMS, PLATFORM_LABEL } from "@/lib/types";
import type { CompareSubject } from "@/lib/compare-page/subjects";

/**
 * One colour per creator, assigned at selection time in the builder and reused
 * in every chart. There is no legend block: the dot beside the name on each
 * slot card is the legend, which keeps the mapping beside the thing being
 * chosen rather than in a key the eye has to travel to.
 */
export const SERIES_COLORS = ["#2563EB", "#0F766E", "#7C3AED", "#B45309"] as const;

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
  /** Every engagement rate on file, for the roster median reference line. */
  rosterEngagement: number[];
  shortlists: { id: string; name: string; clientName: string | null }[];
}) {
  const colorOf = (index: number) => SERIES_COLORS[index % SERIES_COLORS.length];

  const series = creators.map((creator, index) => ({
    key: creator.id,
    name: creator.name,
    color: colorOf(index),
  }));

  const datum = (pick: (creator: CompareSubject) => number | null): CreatorDatum[] =>
    creators.map((creator, index) => ({
      key: creator.id,
      name: creator.name,
      color: colorOf(index),
      value: pick(creator),
    }));

  // A platform row is drawn only where at least one compared creator is on it.
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
  const perThousand = datum((creator) => costPerThousandReach(creator));
  const scores = datum((creator) => creator.agencyScore);
  const sentence = comparisonSentence(creators);
  const slugs = creators.map((creator) => creator.slug).join(",");

  return (
    <section id="compare-report" className="scroll-mt-20 space-y-6 pb-24 lg:pb-16">
      {sentence ? (
        <p className="max-w-[46rem] text-base leading-relaxed">{sentence}</p>
      ) : (
        <p className="max-w-[46rem] text-sm text-ink-muted">
          Not enough is on file to summarise these creators in a sentence. The charts
          below show what is recorded.
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          className="lg:col-span-2"
          label="Follower count across socials"
          summary={creators
            .map(
              (creator) =>
                `${creator.name}: ${
                  creator.platforms
                    .filter((account) => account.followers !== null)
                    .map(
                      (account) =>
                        `${PLATFORM_LABEL[account.platform]} ${formatCompact(account.followers)}`,
                    )
                    .join(", ") || "not on file"
                }`,
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
          <HorizontalBars
            data={engagement}
            format={(value) => formatPercent(value, 1)}
            missingLabel="Not on file"
            reference={median(rosterEngagement)}
            referenceLabel="Roster median"
          />
        </ChartCard>

        <ChartCard
          label="Agency score"
          tooltip="Grid's own reliability score out of 100, weighted from engagement, follower growth, posting consistency, cost efficiency and internal ratings. A creator missing more than two of those is left unscored rather than scored on what is left."
          summary={scores
            .map(
              (entry) =>
                `${entry.name}: ${entry.value === null ? "not on file" : `${Math.round(entry.value)} out of 100`}`,
            )
            .join(". ")}
        >
          <DotPlot data={scores} />
        </ChartCard>

        {/* Price and the figure derived from it, together and full width: the
            cost of a post only means something next to what it buys. */}
        <ChartCard
          className="lg:col-span-2"
          label="Price per post"
          note="The lowest current rate on file for each creator."
          summary={rates
            .map(
              (entry) =>
                `${entry.name}: ${entry.value === null ? "not on file" : formatBdt(entry.value)}`,
            )
            .join(". ")}
        >
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <HorizontalBars
              data={rates}
              format={(value) => formatBdt(Math.round(value))}
              missingLabel="Not on file"
            />

            <div>
              <h4 className="text-sm">Cost per 1,000 reach</h4>
              <p className="mt-1 text-xs text-ink-muted">
                Price divided by reach in thousands, where reach is the sum of followers
                across platforms. Lower is better, and this is the figure worth deciding
                on.
              </p>
              <p className="sr-only">
                {perThousand
                  .map(
                    (entry) =>
                      `${entry.name}: ${entry.value === null ? "not on file" : `${entry.value.toFixed(2)} BDT per thousand reach`}`,
                  )
                  .join(". ")}
              </p>
              <div className="mt-4">
                <HorizontalBars
                  data={perThousand}
                  format={(value) => `BDT ${value.toFixed(2)}`}
                  missingLabel="Not on file"
                />
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-6">
        <Button asChild variant="outline" size="sm">
          <a href={`/api/compare/pdf?ids=${slugs}`}>Export as PDF</a>
        </Button>
        <AddToShortlist
          creatorIds={creators.map((creator) => creator.id)}
          shortlists={shortlists}
          label="Save this comparison"
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
  /** Read in place of the chart by a screen reader. */
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
              className="rounded text-xs text-ink-muted underline decoration-dotted underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              aria-label={`What ${label.toLowerCase()} is made of`}
            >
              ?
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      {note ? <p className="mt-1 text-xs text-ink-muted">{note}</p> : null}
      {summary ? <p className="sr-only">{summary}</p> : null}
      {/* Charts scroll rather than shrink below the width their labels need. */}
      <div className="mt-5 overflow-x-auto">{children}</div>
    </section>
  );
}
