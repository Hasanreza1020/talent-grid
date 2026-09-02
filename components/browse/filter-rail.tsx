"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useOptimistic, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  parseFilters,
  filtersToQuery,
  activeFilterKeys,
  EMPTY_FILTERS,
  type BrowseFilters,
} from "@/lib/browse";
import {
  DATA_CONFIDENCES,
  DATA_CONFIDENCE_LABEL,
  GENDERS,
  GENDER_LABEL,
  LANGUAGES,
  LANGUAGE_LABEL,
  PLATFORMS,
  PLATFORM_LABEL,
  TIERS,
  TIER_LABEL,
  TIER_RANGE_LABEL,
} from "@/lib/types";

export type Facets = {
  categories: { slug: string; name: string; parentName: string | null }[];
  tags: { slug: string; label: string }[];
  cities: string[];
};

/**
 * The filter rail writes every change straight into the URL query string, so
 * the browser back button works, a filtered view can be pasted to a colleague,
 * and the server component re-runs the same pure filter code on the way back.
 *
 * The controls read from an optimistic copy of those filters rather than from
 * the URL directly. A transition keeps the old URL in place until the server
 * has answered, so a box driven straight off `useSearchParams` stays unticked
 * for the length of the query and the click feels dropped. The optimistic
 * value ticks it on the click and is discarded the moment the real URL lands,
 * so the two can never disagree for longer than the round trip.
 */
export function FilterRail({
  facets,
  canSeeRates,
}: {
  facets: Facets;
  canSeeRates: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlFilters = useMemo(
    () => parseFilters(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );
  const [filters, showFilters] = useOptimistic(urlFilters);
  const [searchDraft, setSearchDraft] = useState(urlFilters.q);

  const push = useCallback(
    (next: BrowseFilters) => {
      const query = filtersToQuery(next);
      startTransition(() => {
        showFilters(next);
        router.replace(query ? `/creators?${query}` : "/creators", { scroll: false });
      });
    },
    [router, showFilters],
  );

  const update = useCallback(
    (patch: Partial<BrowseFilters>) => push({ ...filters, ...patch }),
    [filters, push],
  );

  const toggleIn = useCallback(
    <T extends string>(current: T[], value: T): T[] =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    [],
  );

  const activeCount = activeFilterKeys(filters).length;

  return (
    <aside className="w-full shrink-0 lg:w-[280px]" aria-label="Filters">
      <div className="sticky top-14 space-y-6 py-6 lg:max-h-[calc(100dvh-3.5rem)] lg:overflow-y-auto lg:pr-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            update({ q: searchDraft.trim() });
          }}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Name or handle"
              aria-label="Search by name or handle"
              className="bg-surface pl-9"
            />
          </div>
        </form>

        {activeCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-sm text-ink-muted hover:text-ink"
            onClick={() => {
              setSearchDraft("");
              push({ ...EMPTY_FILTERS, sort: filters.sort, view: filters.view });
            }}
          >
            <X className="mr-1 size-3" />
            Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
          </Button>
        ) : null}

        <Group label="Category">
          {facets.categories.map((category) => (
            <CheckRow
              key={category.slug}
              checked={filters.categories.includes(category.slug)}
              onChange={() =>
                update({ categories: toggleIn(filters.categories, category.slug) })
              }
              label={category.name}
              hint={category.parentName ?? undefined}
            />
          ))}
        </Group>

        <Group label="Platform">
          {PLATFORMS.map((platform) => (
            <CheckRow
              key={platform}
              checked={filters.platforms.includes(platform)}
              onChange={() => update({ platforms: toggleIn(filters.platforms, platform) })}
              label={PLATFORM_LABEL[platform]}
            />
          ))}
        </Group>

        <Group label="Followers">
          <RangeInputs
            minValue={filters.followersMin}
            maxValue={filters.followersMax}
            onCommit={(min, max) => update({ followersMin: min, followersMax: max })}
            minLabel="From"
            maxLabel="To"
          />
          <p className="pt-1 text-xs text-ink-muted">
            Applied against the primary account.
          </p>
        </Group>

        <Group label="Engagement rate">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.1"
              min="0"
              inputMode="decimal"
              defaultValue={filters.engagementMin ?? ""}
              onBlur={(event) =>
                update({
                  engagementMin: event.target.value === "" ? null : Number(event.target.value),
                })
              }
              aria-label="Minimum engagement rate"
              className="bg-surface"
            />
            <span className="text-sm text-ink-muted">% and above</span>
          </div>
        </Group>

        <Group label="Tier">
          {TIERS.map((tier) => (
            <CheckRow
              key={tier}
              checked={filters.tiers.includes(tier)}
              onChange={() => update({ tiers: toggleIn(filters.tiers, tier) })}
              label={TIER_LABEL[tier]}
              hint={TIER_RANGE_LABEL[tier]}
            />
          ))}
        </Group>

        {facets.cities.length ? (
          <Group label="City">
            {facets.cities.map((city) => (
              <CheckRow
                key={city}
                checked={filters.cities.includes(city)}
                onChange={() => update({ cities: toggleIn(filters.cities, city) })}
                label={city}
              />
            ))}
          </Group>
        ) : null}

        <Group label="Language">
          {LANGUAGES.map((language) => (
            <CheckRow
              key={language}
              checked={filters.languages.includes(language)}
              onChange={() => update({ languages: toggleIn(filters.languages, language) })}
              label={LANGUAGE_LABEL[language]}
            />
          ))}
        </Group>

        <Group label="Gender">
          {GENDERS.map((gender) => (
            <CheckRow
              key={gender}
              checked={filters.genders.includes(gender)}
              onChange={() => update({ genders: toggleIn(filters.genders, gender) })}
              label={GENDER_LABEL[gender]}
            />
          ))}
        </Group>

        {/* Rates are invisible to viewers, so the filter that reads them is
            hidden rather than shown as a control that silently matches nothing. */}
        {canSeeRates ? (
          <Group label="Rate">
            <RangeInputs
              minValue={filters.rateMin}
              maxValue={filters.rateMax}
              onCommit={(min, max) => update({ rateMin: min, rateMax: max })}
              minLabel="From BDT"
              maxLabel="To BDT"
            />
            <p className="pt-1 text-xs text-ink-muted">
              Applied against the cheapest current rate card.
            </p>
          </Group>
        ) : null}

        {facets.tags.length ? (
          <Group label="Tags">
            {facets.tags.map((tag) => (
              <CheckRow
                key={tag.slug}
                checked={filters.tags.includes(tag.slug)}
                onChange={() => update({ tags: toggleIn(filters.tags, tag.slug) })}
                label={`#${tag.label}`}
              />
            ))}
          </Group>
        ) : null}

        <Group label="Data confidence">
          {DATA_CONFIDENCES.map((confidence) => (
            <CheckRow
              key={confidence}
              checked={filters.dataConfidence.includes(confidence)}
              onChange={() =>
                update({ dataConfidence: toggleIn(filters.dataConfidence, confidence) })
              }
              label={DATA_CONFIDENCE_LABEL[confidence]}
            />
          ))}
        </Group>

        <Group label="Other">
          <ToggleRow
            label="Accepts barter"
            checked={filters.acceptsBarter === true}
            onChange={(checked) => update({ acceptsBarter: checked ? true : null })}
          />
          <ToggleRow
            label="Has a portrait"
            checked={filters.hasPortrait === true}
            onChange={(checked) => update({ hasPortrait: checked ? true : null })}
          />
          <ToggleRow
            label="Needs a portrait"
            checked={filters.hasPortrait === false}
            onChange={(checked) => update({ hasPortrait: checked ? false : null })}
          />
        </Group>

        {isPending ? <p className="text-xs text-ink-muted">Updating</p> : null}
      </div>
    </aside>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details open className="group border-t border-hairline pt-4">
      <summary className="cursor-pointer list-none text-sm font-medium">
        {label}
      </summary>
      <div className="mt-3 space-y-2">{children}</div>
    </details>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <Checkbox checked={checked} onCheckedChange={onChange} className="mt-0.5" />
      <span>
        {label}
        {hint ? <span className="block text-xs text-ink-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="cursor-pointer text-sm font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function RangeInputs({
  minValue,
  maxValue,
  onCommit,
  minLabel,
  maxLabel,
}: {
  minValue: number | null;
  maxValue: number | null;
  onCommit: (min: number | null, max: number | null) => void;
  minLabel: string;
  maxLabel: string;
}) {
  const [min, setMin] = useState(minValue?.toString() ?? "");
  const [max, setMax] = useState(maxValue?.toString() ?? "");

  const commit = () =>
    onCommit(min === "" ? null : Number(min), max === "" ? null : Number(max));

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min="0"
        inputMode="numeric"
        value={min}
        onChange={(event) => setMin(event.target.value)}
        onBlur={commit}
        aria-label={minLabel}
        placeholder={minLabel}
        className="bg-surface"
      />
      <Input
        type="number"
        min="0"
        inputMode="numeric"
        value={max}
        onChange={(event) => setMax(event.target.value)}
        onBlur={commit}
        aria-label={maxLabel}
        placeholder={maxLabel}
        className="bg-surface"
      />
    </div>
  );
}
