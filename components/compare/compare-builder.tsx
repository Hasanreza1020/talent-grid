"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AddMoreColumn, EmptySlot, FilledSlot } from "./creator-slot";
import { CreatorPicker, type PickerFacets } from "./creator-picker";
import { CompareReport } from "./compare-report";
import { useCompare, COMPARE_MAX, COMPARE_MIN } from "./compare-context";
import type { CompareSubject } from "@/lib/compare-page/subjects";

/**
 * The whole of /compare above the report, plus the gate to it.
 *
 * Selection is held in the shared compare context rather than in local state,
 * so the tick boxes on creator cards, the tray at the bottom of the window and
 * these slots are three views of one list. The query string is written from
 * that list so a comparison can be pasted to a colleague, and read back on
 * first mount so a pasted link fills the slots.
 */
export function CompareBuilder({
  candidates,
  facets,
  rosterEngagement,
  shortlists,
}: {
  candidates: CompareSubject[];
  facets: PickerFacets;
  rosterEngagement: number[];
  shortlists: { id: string; name: string; clientName: string | null }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { slugs, add, remove } = useCompare();

  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const hydrated = useRef(false);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);

  const bySlug = useMemo(
    () => new Map(candidates.map((creator) => [creator.slug, creator])),
    [candidates],
  );

  // Read the link once, on first mount. After that the URL follows the
  // selection rather than the other way round, so editing a slot cannot fight
  // with the history entry that produced it.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const fromUrl = (searchParams.get("ids") ?? "")
      .split(",")
      .map((slug) => slug.trim())
      .filter((slug) => slug && bySlug.has(slug))
      .slice(0, COMPARE_MAX);

    for (const slug of fromUrl) {
      if (!slugs.includes(slug)) add(slug, bySlug.get(slug)!.name);
    }
    if (fromUrl.length >= COMPARE_MIN) setReportFor(fromUrl.join(","));
  }, [searchParams, bySlug, slugs, add]);

  // Keep the link in step with the slots without stacking history entries.
  useEffect(() => {
    if (!hydrated.current) return;
    const query = slugs.join(",");
    const current = searchParams.get("ids") ?? "";
    if (query === current) return;
    router.replace(query ? `${pathname}?ids=${query}` : pathname, { scroll: false });
  }, [slugs, pathname, router, searchParams]);

  const selected = slugs
    .map((slug) => bySlug.get(slug))
    .filter((creator): creator is CompareSubject => creator !== undefined);

  // Always at least the two the product is named for, and one spare slot up to
  // the maximum so there is somewhere obvious to drop the next choice.
  const slotCount = Math.max(COMPARE_MIN, Math.min(COMPARE_MAX, selected.length));
  const slots = Array.from({ length: slotCount }, (_, index) => selected[index] ?? null);
  const canAddMore = selected.length >= slotCount && slotCount < COMPARE_MAX;

  const filledCount = selected.length;
  const ready = filledCount >= COMPARE_MIN;
  const currentKey = selected.map((creator) => creator.slug).join(",");
  const reportVisible = reportFor !== null && reportFor === currentKey && ready;

  const onSelect = useCallback(
    (index: number, creator: CompareSubject) => {
      const occupant = selected[index];
      if (occupant) remove(occupant.slug);
      add(creator.slug, creator.name);
      setPickerFor(null);
      // Focus returns to the slot the choice filled, not to the page top.
      window.requestAnimationFrame(() => slotRefs.current[index]?.focus());
    },
    [selected, add, remove],
  );

  const compare = () => {
    setReportFor(currentKey);
    window.requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("compare-report")?.scrollIntoView({
        behavior: reduced ? "auto" : "smooth",
        block: "start",
      });
    });
  };

  return (
    <div className="mx-auto max-w-[80rem] px-6 py-10">
      <h1 className="font-display text-xl">Compare</h1>
      <p className="mt-2 max-w-[46rem] text-sm text-ink-muted">
        Put two to four creators side by side. Every figure here is read from the record
        as it stands; nothing is estimated, and a gap stays a gap.
      </p>

      {/*
        Stacked on mobile, where "vs" is a horizontal label sitting between the
        first two slots; two up at tablet, where it would be pointing across a
        gap that is not there and is dropped; one row from lg, where it sits
        between the first two again.
      */}
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:flex-row lg:items-stretch">
          {slots.map((creator, index) => (
            <Fragment key={creator?.id ?? `empty-${index}`}>
              {index === 1 ? (
                <div
                  aria-hidden
                  className="flex items-center justify-center text-sm text-ink-muted sm:hidden lg:flex lg:px-1"
                >
                  vs
                </div>
              ) : null}
              <div className="min-w-0 lg:flex-1">
                {creator ? (
                  <FilledSlot
                    creator={creator}
                    index={index}
                    slotRef={(node) => {
                      slotRefs.current[index] = node;
                    }}
                    onChange={() => setPickerFor(index)}
                    onClear={() => remove(creator.slug)}
                  />
                ) : (
                  <EmptySlot index={index} onOpen={() => setPickerFor(index)} />
                )}
              </div>
            </Fragment>
          ))}
        </div>

        {canAddMore ? <AddMoreColumn onOpen={() => setPickerFor(slotCount)} /> : null}
      </div>

      <div className="mt-8 flex flex-col items-center">
        {/* The one orange control on the screen. Disabled it goes neutral
            rather than a faded orange, so a half-finished comparison never
            looks like the accent is simply dim. */}
        <Button
          size="lg"
          disabled={!ready}
          onClick={compare}
          className="rounded-lg px-8 disabled:pointer-events-auto disabled:cursor-not-allowed disabled:bg-muted disabled:text-ink-muted disabled:opacity-100"
        >
          Compare
        </Button>
        {!ready ? (
          <p className="mt-2 text-sm text-ink-muted">Pick at least two creators</p>
        ) : null}
      </div>

      {reportVisible ? (
        <div className="mt-12">
          <CompareReport
            creators={selected}
            rosterEngagement={rosterEngagement}
            shortlists={shortlists}
          />
        </div>
      ) : null}

      <CreatorPicker
        open={pickerFor !== null}
        onOpenChange={(open) => setPickerFor(open ? pickerFor : null)}
        candidates={candidates}
        facets={facets}
        takenSlugs={slugs}
        onSelect={(creator) => onSelect(pickerFor ?? 0, creator)}
      />
    </div>
  );
}
