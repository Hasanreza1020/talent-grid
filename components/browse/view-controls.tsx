"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Sort } from "@/lib/browse";
import { useBrowse } from "@/components/browse/browse-context";

/**
 * Sort and view. Reads the same optimistic filters the rail does, so the select
 * and the two view buttons show the choice on the click rather than when the
 * re-sorted rows come back.
 */
export function ViewControls({
  sorts,
  sortLabels,
}: {
  sorts: readonly Sort[];
  sortLabels: Record<Sort, string>;
}) {
  const { filters, update } = useBrowse();
  const go = update;

  return (
    <div className="flex items-center gap-3">
      <Select value={filters.sort} onValueChange={(value) => go({ sort: value as Sort })}>
        <SelectTrigger className="h-9 w-[190px] bg-surface" aria-label="Sort by">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sorts.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {sortLabels[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center rounded-md border border-hairline bg-surface p-0.5">
        <ViewButton
          active={filters.view === "grid"}
          onClick={() => go({ view: "grid" })}
          label="Grid view"
        >
          <LayoutGrid className="size-4" />
        </ViewButton>
        <ViewButton
          active={filters.view === "table"}
          onClick={() => go({ view: "table" })}
          label="Table view"
        >
          <Rows3 className="size-4" />
        </ViewButton>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "rounded p-1.5 transition-colors",
        active ? "bg-muted text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
