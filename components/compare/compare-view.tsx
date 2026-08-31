"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Notice, SectionHeading } from "@/components/ui-bits";
import { BenchmarkRadar } from "@/components/charts";
import { AddToShortlist } from "@/components/shortlist/add-to-shortlist";
import { buildComparison, summariseComparison } from "@/lib/compare";
import type { CompareCreator } from "@/lib/db/compare";
import type { CreatorMetrics } from "@/lib/metrics/directory";
import { initialsOf } from "@/lib/format";
import {
  DELIVERABLE_LABEL,
  PLATFORM_LABEL,
  type Deliverable,
  type Platform,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const RADAR_AXES = [
  { key: "engagement", label: "Engagement" },
  { key: "reach", label: "Reach" },
  { key: "growth", label: "Growth" },
  { key: "cost", label: "Cost efficiency" },
  { key: "consistency", label: "Consistency" },
];

export function CompareView({
  creators,
  metricsEntries,
  shortlists,
}: {
  creators: CompareCreator[];
  metricsEntries: [string, CreatorMetrics][];
  shortlists: { id: string; name: string; clientName: string | null }[];
}) {
  const metrics = useMemo(() => new Map(metricsEntries), [metricsEntries]);

  // Percentile mode is the default: it makes creators of different sizes
  // comparable, which is the more useful thing in a client conversation.
  const [normalised, setNormalised] = useState(true);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const allDeliverables = useMemo(
    () => [...new Set(creators.flatMap((creator) => creator.rates.map((r) => r.deliverable)))],
    [creators],
  );
  const [deliverable, setDeliverable] = useState<Deliverable | null>(
    allDeliverables[0] ?? null,
  );

  const groups = useMemo(
    () => buildComparison(creators, metrics, { platform, deliverable, normalised }),
    [creators, metrics, platform, deliverable, normalised],
  );

  const summary = useMemo(() => summariseComparison(creators, groups), [creators, groups]);

  // Platforms where every selected creator actually has an account, which is
  // the only set that makes a like-for-like comparison possible.
  const sharedPlatforms = useMemo(() => {
    const all: Platform[] = ["facebook", "instagram", "tiktok", "youtube"];
    return all.filter((entry) =>
      creators.every((creator) =>
        creator.accounts.some((account) => account.platform === entry),
      ),
    );
  }, [creators]);

  const primaryPlatforms = new Set(
    creators.map((creator) => creator.primaryPlatform).filter(Boolean),
  );
  const mixedPlatforms = primaryPlatforms.size > 1;

  const radarSeries = creators.map((creator) => {
    const own = metrics.get(creator.id);
    return {
      key: creator.id,
      label: creator.displayName,
      values: {
        engagement: own?.percentiles.engagement.value ?? null,
        reach: own?.percentiles.reach.value ?? null,
        growth: own?.percentiles.growth.value ?? null,
        cost: own?.percentiles.costPerEngagement.value ?? null,
        consistency: own?.percentiles.consistency.value ?? null,
      },
    };
  });

  const hasRadarData = radarSeries.some((series) =>
    Object.values(series.values).some((value) => value !== null),
  );

  const columnWidth = "minmax(11rem, 1fr)";
  const gridTemplate = `minmax(11rem, 14rem) repeat(${creators.length}, ${columnWidth})`;

  return (
    <div className="mx-auto max-w-[80rem] px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl">Compare</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {creators.length} creators, side by side.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AddToShortlist
            creatorIds={creators.map((creator) => creator.id)}
            shortlists={shortlists}
            label="Add all to shortlist"
          />
          <Button asChild variant="outline">
            <a
              href={`/api/compare/pdf?ids=${creators.map((c) => c.slug).join(",")}${
                deliverable ? `&deliverable=${deliverable}` : ""
              }${platform ? `&platform=${platform}` : ""}&normalised=${normalised}`}
            >
              Export PDF
            </a>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Comparison link copied.");
            }}
          >
            <Copy className="mr-2 size-4" />
            Copy link
          </Button>
        </div>
      </div>

      {mixedPlatforms ? (
        <div className="mt-6">
          <Notice title="These creators lead on different platforms">
            Engagement rates are not directly comparable across platforms, because a view
            on one platform does not mean the same thing as a view on another.
            {sharedPlatforms.length > 0
              ? " Restrict the comparison to a single platform to read these figures like for like."
              : " There is no single platform on which all of these creators have an account, so a like-for-like view is not available."}
          </Notice>
        </div>
      ) : null}

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-end gap-6 border-y border-hairline py-4">
        <div className="space-y-1.5">
          <Label htmlFor="platform-select" className="text-xs text-ink-muted">
            Platform
          </Label>
          <Select
            value={platform ?? "primary"}
            onValueChange={(value) =>
              setPlatform(value === "primary" ? null : (value as Platform))
            }
          >
            <SelectTrigger id="platform-select" className="w-[200px] bg-surface">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="primary">Each creator&rsquo;s primary</SelectItem>
              {sharedPlatforms.map((entry) => (
                <SelectItem key={entry} value={entry}>
                  {PLATFORM_LABEL[entry]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deliverable-select" className="text-xs text-ink-muted">
            Price on
          </Label>
          <Select
            value={deliverable ?? "none"}
            onValueChange={(value) =>
              setDeliverable(value === "none" ? null : (value as Deliverable))
            }
          >
            <SelectTrigger id="deliverable-select" className="w-[220px] bg-surface">
              <SelectValue placeholder="No rates on file" />
            </SelectTrigger>
            <SelectContent>
              {allDeliverables.length === 0 ? (
                <SelectItem value="none">No rates on file</SelectItem>
              ) : (
                allDeliverables.map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {DELIVERABLE_LABEL[entry]}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-3 pb-2">
          <Switch id="normalised" checked={normalised} onCheckedChange={setNormalised} />
          <Label htmlFor="normalised" className="cursor-pointer text-sm font-normal">
            Show percentiles within peer group
          </Label>
        </div>
      </div>

      {/* Table */}
      <div className="mt-8 overflow-x-auto">
        <div style={{ minWidth: `${11 + creators.length * 11}rem` }}>
          {/* Sticky portrait header */}
          <div
            className="sticky top-14 z-20 grid gap-px border-b border-hairline bg-canvas pb-3 pt-3"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div />
            {creators.map((creator) => (
              <div
                key={creator.id}
                className="px-2"
                onMouseEnter={() => setHovered(creator.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <Link href={`/creators/${creator.slug}`} className="group block">
                  <span className="block aspect-[4/5] w-full max-w-[7rem] overflow-hidden rounded-xl bg-stone">
                    {creator.portraitUrl ? (
                      <Image
                        src={creator.portraitUrl}
                        alt={creator.displayName}
                        width={140}
                        height={175}
                        className="portrait-media size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center font-display text-lg text-ink/45">
                        {initialsOf(creator.displayName)}
                      </span>
                    )}
                  </span>
                  <span className="mt-2 block font-display text-base leading-tight">
                    {creator.displayName}
                  </span>
                </Link>
              </div>
            ))}
          </div>

          {groups.map((group) => (
            <section key={group.key} className="pt-8">
              <h2 className="pb-2 text-sm font-medium text-ink-muted">{group.label}</h2>
              <div>
                {group.rows.map((row) => (
                  <CompareRowView
                    key={row.key}
                    row={row}
                    gridTemplate={gridTemplate}
                    hovered={hovered}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Radar */}
      <section className="mt-12 space-y-4">
        <SectionHeading>Across five axes</SectionHeading>
        {hasRadarData ? (
          <div
            className="max-w-[38rem]"
            onMouseLeave={() => setHovered(null)}
          >
            <BenchmarkRadar
              axes={RADAR_AXES}
              series={radarSeries}
              highlightKey={hovered}
            />
            <div className="flex flex-wrap gap-4 pt-2">
              {creators.map((creator) => (
                <button
                  key={creator.id}
                  type="button"
                  onMouseEnter={() => setHovered(creator.id)}
                  onFocus={() => setHovered(creator.id)}
                  className={cn(
                    "text-sm transition-colors",
                    hovered === creator.id ? "text-brand" : "text-ink-muted",
                  )}
                >
                  {creator.displayName}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            None of these creators has enough recorded data to be ranked against their
            peer group yet, so there is nothing to plot.
          </p>
        )}
      </section>

      {/* Summary */}
      <section className="mt-12 space-y-4">
        <SectionHeading>In short</SectionHeading>
        <ul className="max-w-prose space-y-2 text-sm">
          {summary.map((sentence) => (
            <li key={sentence}>{sentence}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function CompareRowView({
  row,
  gridTemplate,
  hovered,
}: {
  row: ReturnType<typeof buildComparison>[number]["rows"][number];
  gridTemplate: string;
  hovered: string | null;
}) {
  // A row where every value is missing collapses by default, but is never
  // removed: the fact that nobody has the data is itself worth seeing.
  const [expanded, setExpanded] = useState(false);

  if (row.allMissing && !expanded) {
    return (
      <div className="grid items-center border-b border-hairline" style={{ gridTemplateColumns: gridTemplate }}>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 py-2 text-left text-sm text-ink-muted hover:text-ink"
        >
          <ChevronDown className="size-3.5" />
          {row.label}
          <span className="text-xs">no data for any</span>
        </button>
        <div style={{ gridColumn: `2 / -1` }} />
      </div>
    );
  }

  return (
    <div
      className="grid items-center border-b border-hairline"
      style={{ gridTemplateColumns: gridTemplate }}
    >
      <div className="py-2.5 pr-4 text-sm text-ink-muted">{row.label}</div>
      {row.cells.map((cell) => (
        <div
          key={cell.creatorId}
          className={cn(
            "px-2 py-2.5 text-sm",
            // The best value gets a light orange field and a small marker.
            // Both are suppressed entirely when two or more values are missing.
            cell.isBest && "bg-brand-quiet",
            cell.display === "No data" && "text-ink-muted",
            hovered === cell.creatorId && !cell.isBest && "bg-muted/60",
          )}
        >
          <span className={cn(row.direction !== null && cell.value !== null && "numeral")}>
            {cell.display}
          </span>
          {cell.isBest ? (
            <span
              aria-label="Best value in this row"
              className="ml-2 inline-block size-1.5 rounded-full bg-brand align-middle"
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}
