"use client";

import Image from "next/image";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformIcon } from "@/components/platform-icon";
import { formatCompact, initialsOf, NO_DATA } from "@/lib/format";
import type { CompareSubject } from "@/lib/compare-page/subjects";

/** An unfilled slot: a dashed outline that is itself the button. */
export function EmptySlot({
  index,
  onOpen,
}: {
  index: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Add creator to slot ${index + 1}`}
      className="flex min-h-[280px] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-hairline bg-surface text-ink-muted transition-colors hover:border-ink/30 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <Plus className="size-8" strokeWidth={1.5} />
      <span className="text-sm">Add creator</span>
    </button>
  );
}

/** A filled slot. Solid border, no shadow, no decoration. */
export function FilledSlot({
  creator,
  index,
  color,
  onChange,
  onClear,
  slotRef,
}: {
  creator: CompareSubject;
  index: number;
  /** The creator's chart colour. The dot beside the name is the chart legend. */
  color: string;
  onChange: () => void;
  onClear: () => void;
  slotRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={slotRef}
      role="button"
      tabIndex={0}
      onClick={onChange}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onChange();
        }
      }}
      aria-label={`Slot ${index + 1}, ${creator.name}. Choose a different creator`}
      className="relative flex min-h-[280px] w-full cursor-pointer flex-col items-center rounded-xl border border-hairline bg-surface p-5 text-center transition-colors hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={(event) => {
          event.stopPropagation();
          onClear();
        }}
        aria-label={`Clear slot ${index + 1}, ${creator.name}`}
        className="absolute right-2 top-2 size-7 p-0 text-ink-muted hover:text-ink"
      >
        <X className="size-4" />
      </Button>

      <div className="mt-6 size-14 shrink-0 overflow-hidden rounded-full bg-stone">
        {creator.avatarUrl ? (
          <Image
            src={creator.avatarUrl}
            alt=""
            width={56}
            height={56}
            sizes="56px"
            className="size-full object-cover"
          />
        ) : (
          <span className="flex size-full items-center justify-center font-display text-sm text-ink/45">
            {initialsOf(creator.name)}
          </span>
        )}
      </div>

      <p className="mt-3 flex items-center justify-center gap-2 text-base font-medium leading-tight">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ background: color }}
        />
        <span className="line-clamp-2">{creator.name}</span>
      </p>

      <p className="mt-0.5 truncate text-sm text-ink-muted">
        {creator.handle ? `@${creator.handle}` : "Handle not on file"}
      </p>

      {creator.category ? (
        <span className="mt-2 rounded-full border border-hairline px-2 py-0.5 text-xs text-ink-muted">
          {creator.category}
        </span>
      ) : null}

      <p className="mt-2 text-sm text-ink-muted">{creator.city ?? "City not on file"}</p>

      <p className="numeral mt-3 text-lg leading-none">
        {creator.totalFollowers === null ? (
          <span className="text-sm text-ink-muted">{NO_DATA}</span>
        ) : (
          formatCompact(creator.totalFollowers)
        )}
      </p>
      <p className="mt-1 text-xs text-ink-muted">Followers across platforms</p>

      <p className="numeral mt-2 text-sm">
        {creator.engagementRate === null ? (
          <span className="text-xs text-ink-muted">Engagement not on file</span>
        ) : (
          <>
            {creator.engagementRate.toFixed(1)}%
            <span className="text-xs text-ink-muted"> engagement</span>
          </>
        )}
      </p>

      {creator.platforms.length > 0 ? (
        <ul className="mt-auto flex flex-wrap items-center justify-center gap-2 pt-4">
          {creator.platforms.map((account) => (
            <li key={account.platform} className="text-ink-muted">
              <PlatformIcon platform={account.platform} className="size-4" />
              <span className="sr-only">{account.platform}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * The Add more column. Fixed width beside the slots on desktop, a full-width
 * button once the row stops being a row.
 */
export function AddMoreColumn({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Add another creator to compare"
      className="flex min-h-[56px] w-full flex-col items-center justify-center gap-2 rounded-xl border border-hairline bg-surface p-3 text-ink-muted transition-colors hover:border-ink/30 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:min-h-[280px] lg:w-[max(88px,calc(var(--slot-width,220px)/3))] lg:shrink-0"
    >
      <Plus className="size-5" strokeWidth={1.5} />
      <span className="text-xs">Add more</span>
    </button>
  );
}
