"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Portrait } from "./portrait";
import { ScrimChip } from "@/components/ui-bits";
import { PlatformIcon } from "@/components/platform-icon";
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
          sizes="(min-width: 1280px) 280px, (min-width: 768px) 30vw, 90vw"
        >
          {data.primaryCategoryName ? (
            <ScrimChip>{data.primaryCategoryName}</ScrimChip>
          ) : null}
          {data.tagLabels.slice(0, 1).map((label) => (
            <ScrimChip key={label}>#{label}</ScrimChip>
          ))}
        </Portrait>
      </Link>

      {/* Compare checkbox sits in the top right of the card, outside the link
          so that ticking it never navigates. */}
      <label className="absolute right-3 top-3 flex size-7 cursor-pointer items-center justify-center rounded-md border border-white/40 bg-black/35 backdrop-blur-[2px]">
        <Checkbox
          checked={selected}
          onCheckedChange={() => toggle(data.slug, data.displayName)}
          aria-label={`Add ${data.displayName} to compare`}
          className="border-white/70 data-[state=checked]:border-brand data-[state=checked]:bg-brand"
        />
      </label>

      <div className="mt-3">
        <h3 className="font-display text-lg leading-tight">
          <Link href={`/creators/${data.slug}`}>{data.displayName}</Link>
        </h3>

        {/* The handle is part of the record, not a hover reveal: it is how the
            team refers to a creator out loud and in a client email. */}
        <p className="mt-0.5 truncate text-sm text-ink-muted">
          {data.primaryHandle ? `@${data.primaryHandle}` : "Handle not on file"}
        </p>

        {/* One row, one column per platform. The mark identifies the platform
            so the number keeps the serif and stays what you read. */}
        {data.accounts.length === 0 ? (
          <p className="mt-3 border-t border-hairline pt-3 text-sm text-ink-muted">
            No accounts on file
          </p>
        ) : (
          <dl className="mt-3 flex flex-wrap items-start gap-x-5 gap-y-3 border-t border-hairline pt-3">
            {data.accounts.map((account) => (
              <div key={account.platform} className="flex items-center gap-2">
                <dt className="text-ink-muted">
                  <PlatformIcon platform={account.platform} className="size-5" />
                  <span className="sr-only">{account.platformLabel}</span>
                </dt>
                <dd
                  className={
                    account.followers === null
                      ? "text-xs text-ink-muted"
                      : "numeral text-base leading-none text-ink"
                  }
                >
                  {account.followers === null ? NO_DATA : formatCompact(account.followers)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {data.engagementRate !== null ? (
          <p className="mt-3 text-xs text-ink-muted">
            {data.engagementLabel}{" "}
            <span className="numeral text-sm text-ink">
              {data.engagementRate.toFixed(2)}%
            </span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
