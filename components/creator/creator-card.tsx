"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Portrait } from "./portrait";
import { ScrimChip } from "@/components/ui-bits";
import { formatCompact, NO_DATA } from "@/lib/format";
import { useCompare } from "@/components/compare/compare-context";
import type { CardData } from "@/lib/card";

export function CreatorCard({ data }: { data: CardData }) {
  const { isSelected, toggle } = useCompare();
  const selected = isSelected(data.slug);

  return (
    <article className="relative">
      <Link href={`/creators/${data.slug}`} className="block">
        <Portrait
          name={data.displayName}
          src={data.portraitUrl}
          handle={data.primaryHandle}
        >
          {data.primaryCategoryName ? (
            <ScrimChip>{data.primaryCategoryName}</ScrimChip>
          ) : null}
          {data.tagLabels.slice(0, 2).map((label) => (
            <ScrimChip key={label}>#{label}</ScrimChip>
          ))}
        </Portrait>
      </Link>

      {/* Compare checkbox sits in the top right of the card, outside the link
          so that ticking it never navigates. */}
      <label
        className="absolute right-3 top-3 flex size-7 cursor-pointer items-center justify-center rounded-md border border-white/40 bg-black/35 backdrop-blur-[2px]"
        onClick={(event) => event.stopPropagation()}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => toggle(data.slug, data.displayName)}
          aria-label={`Add ${data.displayName} to compare`}
          className="border-white/70 data-[state=checked]:border-brand data-[state=checked]:bg-brand"
        />
      </label>

      <div className="mt-3 space-y-1">
        <h3 className="font-display text-lg leading-tight">
          <Link href={`/creators/${data.slug}`}>{data.displayName}</Link>
        </h3>
        <p className="text-sm text-ink-muted">
          {data.primaryHandle ? `@${data.primaryHandle}` : "Handle not on file"}
          {data.primaryPlatformLabel ? ` on ${data.primaryPlatformLabel}` : ""}
        </p>
        <dl className="flex items-baseline gap-6 pt-1">
          <div>
            <dt className="text-xs text-ink-muted">Followers</dt>
            <dd className="numeral text-lg">{formatCompact(data.followers)}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-muted">{data.engagementLabel}</dt>
            <dd className="numeral text-lg">
              {data.engagementRate === null ? (
                <span className="text-base text-ink-muted">{NO_DATA}</span>
              ) : (
                `${data.engagementRate.toFixed(2)}%`
              )}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  );
}
