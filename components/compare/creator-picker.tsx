"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ChevronDown, Search, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { formatBdt, formatCompact, formatPercent, initialsOf, NO_DATA } from "@/lib/format";
import { PLATFORMS, PLATFORM_LABEL, TIERS, TIER_LABEL, TIER_RANGE_LABEL } from "@/lib/types";
import type { Platform, Tier } from "@/lib/types";
import type { CompareSubject } from "@/lib/compare-page/subjects";

const RATE_MAX = 500_000;
const RATE_STEP = 5_000;

const ENGAGEMENT_CHOICES = [
  { value: "any", label: "Any", min: null },
  { value: "1", label: "1%+", min: 1 },
  { value: "3", label: "3%+", min: 3 },
  { value: "5", label: "5%+", min: 5 },
] as const;

export type PickerFacets = {
  categories: { slug: string; name: string }[];
  cities: string[];
};

type PickerFilters = {
  q: string;
  categories: string[];
  platforms: Platform[];
  tiers: Tier[];
  city: string | null;
  rate: [number, number];
  engagement: (typeof ENGAGEMENT_CHOICES)[number]["value"];
};

const EMPTY: PickerFilters = {
  q: "",
  categories: [],
  platforms: [],
  tiers: [],
  city: null,
  rate: [0, RATE_MAX],
  engagement: "any",
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

/**
 * The creator picker.
 *
 * Filtering runs in memory over the candidate list the server already loaded,
 * which is what makes it feel instant: at this product's scale the whole
 * directory is a few hundred rows, and a round trip per keystroke would buy
 * nothing. The predicates below are the picker's own, deliberately narrower
 * than the browse rail's — this is a search box, not a second filter surface.
 */
export function CreatorPicker({
  open,
  onOpenChange,
  candidates,
  facets,
  takenSlugs,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: CompareSubject[];
  facets: PickerFacets;
  takenSlugs: string[];
  onSelect: (creator: CompareSubject) => void;
}) {
  const [filters, setFilters] = useState<PickerFilters>(EMPTY);

  const patch = (next: Partial<PickerFilters>) =>
    setFilters((current) => ({ ...current, ...next }));

  const results = useMemo(() => {
    const needle = filters.q.trim().toLowerCase();
    const minEngagement =
      ENGAGEMENT_CHOICES.find((choice) => choice.value === filters.engagement)?.min ?? null;
    const [rateMin, rateMax] = filters.rate;
    const rateNarrowed = rateMin > 0 || rateMax < RATE_MAX;

    return candidates.filter((creator) => {
      if (needle) {
        const haystack = `${creator.name} ${creator.handle ?? ""}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (filters.categories.length && !filters.categories.includes(creator.categorySlug ?? "")) {
        return false;
      }
      if (
        filters.platforms.length &&
        !creator.platforms.some((account) => filters.platforms.includes(account.platform))
      ) {
        return false;
      }
      if (filters.tiers.length && !(creator.tier && filters.tiers.includes(creator.tier))) {
        return false;
      }
      if (filters.city && creator.city !== filters.city) return false;

      // A creator with no rate on file is excluded once a rate range is set,
      // rather than treated as free. Nothing here fills a gap with a number.
      if (rateNarrowed) {
        if (creator.ratePerPost === null) return false;
        if (creator.ratePerPost < rateMin || creator.ratePerPost > rateMax) return false;
      }
      if (minEngagement !== null) {
        if (creator.engagementRate === null) return false;
        if (creator.engagementRate < minEngagement) return false;
      }
      return true;
    });
  }, [candidates, filters]);

  const chips: { key: string; label: string; clear: () => void }[] = [
    ...filters.categories.map((slug) => ({
      key: `category:${slug}`,
      label: facets.categories.find((entry) => entry.slug === slug)?.name ?? slug,
      clear: () => patch({ categories: filters.categories.filter((s) => s !== slug) }),
    })),
    ...filters.platforms.map((platform) => ({
      key: `platform:${platform}`,
      label: PLATFORM_LABEL[platform],
      clear: () => patch({ platforms: filters.platforms.filter((p) => p !== platform) }),
    })),
    ...filters.tiers.map((tier) => ({
      key: `tier:${tier}`,
      label: TIER_LABEL[tier],
      clear: () => patch({ tiers: filters.tiers.filter((t) => t !== tier) }),
    })),
    ...(filters.city ? [{ key: "city", label: filters.city, clear: () => patch({ city: null }) }] : []),
    ...(filters.rate[0] > 0 || filters.rate[1] < RATE_MAX
      ? [
          {
            key: "rate",
            label: `${formatBdt(filters.rate[0])} to ${formatBdt(filters.rate[1])}`,
            clear: () => patch({ rate: [0, RATE_MAX] as [number, number] }),
          },
        ]
      : []),
    ...(filters.engagement !== "any"
      ? [
          {
            key: "engagement",
            label: `${ENGAGEMENT_CHOICES.find((c) => c.value === filters.engagement)?.label} engagement`,
            clear: () => patch({ engagement: "any" }),
          },
        ]
      : []),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] w-full flex-col gap-0 p-0 sm:max-w-[720px]">
        <DialogHeader className="space-y-3 border-b border-hairline p-5">
          <DialogTitle className="text-base">Add a creator</DialogTitle>
          <DialogDescription className="sr-only">
            Search and filter the directory, then choose a creator for this slot.
          </DialogDescription>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <Input
              autoFocus
              value={filters.q}
              onChange={(event) => patch({ q: event.target.value })}
              placeholder="Search by name or handle"
              aria-label="Search by name or handle"
              className="bg-surface pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MultiSelect
              label="Category"
              count={filters.categories.length}
              options={facets.categories.map((entry) => ({
                value: entry.slug,
                label: entry.name,
              }))}
              selected={filters.categories}
              onToggle={(value) => patch({ categories: toggle(filters.categories, value) })}
            />
            <MultiSelect
              label="Platform"
              count={filters.platforms.length}
              options={PLATFORMS.map((platform) => ({
                value: platform,
                label: PLATFORM_LABEL[platform],
              }))}
              selected={filters.platforms}
              onToggle={(value) =>
                patch({ platforms: toggle(filters.platforms, value as Platform) })
              }
            />
            <MultiSelect
              label="Followers"
              count={filters.tiers.length}
              options={TIERS.map((tier) => ({
                value: tier,
                label: `${TIER_LABEL[tier]} (${TIER_RANGE_LABEL[tier].replace(" followers", "")})`,
              }))}
              selected={filters.tiers}
              onToggle={(value) => patch({ tiers: toggle(filters.tiers, value as Tier) })}
            />

            <Select
              value={filters.city ?? "any"}
              onValueChange={(value) => patch({ city: value === "any" ? null : value })}
            >
              <SelectTrigger className="h-8 w-auto gap-1.5 rounded-lg bg-surface text-xs">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any city</SelectItem>
                {facets.cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.engagement}
              onValueChange={(value) =>
                patch({ engagement: value as PickerFilters["engagement"] })
              }
            >
              <SelectTrigger className="h-8 w-auto gap-1.5 rounded-lg bg-surface text-xs">
                <SelectValue placeholder="Min engagement" />
              </SelectTrigger>
              <SelectContent>
                {ENGAGEMENT_CHOICES.map((choice) => (
                  <SelectItem key={choice.value} value={choice.value}>
                    {choice.label === "Any" ? "Any engagement" : `${choice.label} engagement`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex min-w-[210px] flex-1 items-center gap-3 rounded-lg border border-hairline bg-surface px-3 py-1.5">
              <span className="shrink-0 text-xs text-ink-muted">Rate per post</span>
              <Slider
                value={filters.rate}
                min={0}
                max={RATE_MAX}
                step={RATE_STEP}
                onValueChange={(value) => patch({ rate: [value[0], value[1]] })}
                aria-label="Rate per post range in BDT"
                className="flex-1"
              />
            </div>
          </div>

          {chips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="flex items-center gap-1 rounded-full border border-hairline px-2 py-0.5 text-xs text-ink-muted hover:text-ink"
                >
                  {chip.label}
                  <X className="size-3" />
                  <span className="sr-only">Remove filter</span>
                </button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(EMPTY)}
                className="h-auto p-0 pl-1 text-xs text-ink-muted hover:text-ink"
              >
                Clear all
              </Button>
            </div>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {results.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-base">
                No creators match these filters. Try widening the follower range.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setFilters(EMPTY)}
              >
                Clear all filters
              </Button>
            </div>
          ) : (
            <ul>
              {results.map((creator) => {
                const taken = takenSlugs.includes(creator.slug);
                return (
                  <li
                    key={creator.id}
                    className="flex h-16 items-center gap-3 border-b border-hairline last:border-b-0"
                  >
                    <div
                      className={`size-9 shrink-0 overflow-hidden rounded-full bg-stone ${taken ? "opacity-40" : ""}`}
                    >
                      {creator.avatarUrl ? (
                        <Image
                          src={creator.avatarUrl}
                          alt=""
                          width={36}
                          height={36}
                          sizes="36px"
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="flex size-full items-center justify-center font-display text-xs text-ink/45">
                          {initialsOf(creator.name)}
                        </span>
                      )}
                    </div>

                    <div className={`min-w-0 flex-1 ${taken ? "opacity-40" : ""}`}>
                      <p className="truncate text-sm leading-tight">{creator.name}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {creator.handle ? `@${creator.handle}` : "Handle not on file"}
                      </p>
                    </div>

                    {creator.category ? (
                      <span
                        className={`hidden shrink-0 rounded-full border border-hairline px-2 py-0.5 text-xs text-ink-muted sm:block ${taken ? "opacity-40" : ""}`}
                      >
                        {creator.category}
                      </span>
                    ) : null}

                    <dl
                      className={`hidden shrink-0 items-center gap-4 text-right sm:flex ${taken ? "opacity-40" : ""}`}
                    >
                      <Figure
                        label="Followers"
                        value={
                          creator.totalFollowers === null
                            ? null
                            : formatCompact(creator.totalFollowers)
                        }
                      />
                      <Figure
                        label="Engagement"
                        value={
                          creator.engagementRate === null
                            ? null
                            : formatPercent(creator.engagementRate, 1)
                        }
                      />
                      <Figure
                        label="Rate"
                        value={
                          creator.ratePerPost === null ? null : formatBdt(creator.ratePerPost)
                        }
                      />
                    </dl>

                    <div className="shrink-0 pl-1">
                      {taken ? (
                        <span className="text-xs text-ink-muted">Already added</span>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => onSelect(creator)}>
                          Select
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className="border-t border-hairline px-5 py-3 text-xs text-ink-muted">
          {results.length} of {candidates.length} creators
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Figure({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="w-[74px]">
      <dt className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className={value === null ? "text-xs text-ink-muted" : "numeral text-xs"}>
        {value ?? NO_DATA}
      </dd>
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
  count,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  count: number;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-lg text-xs font-normal"
        >
          {label}
          {count > 0 ? <span className="numeral text-ink-muted">{count}</span> : null}
          <ChevronDown className="size-3.5 text-ink-muted" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selected.includes(option.value)}
            onCheckedChange={() => onToggle(option.value)}
            onSelect={(event) => event.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
