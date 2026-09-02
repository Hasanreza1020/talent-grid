"use client";

import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initialsOf } from "@/lib/format";
import { useCompare, COMPARE_MIN, COMPARE_MAX } from "./compare-context";

type Summary = {
  slug: string;
  displayName: string;
  portraitUrl: string | null;
  primaryHandle: string | null;
};

function useSummaries(slugs: string[]) {
  return useQuery({
    queryKey: ["creator-summaries", [...slugs].sort().join(",")],
    enabled: slugs.length > 0,
    queryFn: async (): Promise<Summary[]> => {
      try {
        const response = await fetch(`/api/creators/summary?slugs=${slugs.join(",")}`);
        if (!response.ok) return [];
        // An expired session is redirected to the login page by the
        // middleware, so the body can be HTML rather than JSON.
        const body = await response.json();
        return (body.creators ?? []) as Summary[];
      } catch {
        return [];
      }
    },
  });
}

/**
 * The sticky selection bar. It appears as soon as one creator is selected and
 * persists across navigation within the session. It is the only element in the
 * product with a shadow, which is what lifts it off the page.
 */
export function CompareTray() {
  const { slugs, remove, clear, pending, resolvePending, cancelPending } = useCompare();
  const { data: summaries = [] } = useSummaries(slugs);

  if (slugs.length === 0) return null;

  const ordered = slugs
    .map((slug) => summaries.find((summary) => summary.slug === slug))
    .filter((summary): summary is Summary => summary !== undefined);

  const ready = slugs.length >= COMPARE_MIN;

  return (
    <div className="sticky bottom-0 z-50 border-t border-hairline bg-surface shadow-tray">
      {pending ? (
        <div className="border-b border-hairline bg-brand-quiet px-6 py-3">
          <p className="mx-auto max-w-[80rem] text-sm text-ink">
            Compare holds {COMPARE_MAX} creators. To add{" "}
            <span className="font-medium">{pending.displayName}</span>, choose which one
            to drop.
          </p>
          <div className="mx-auto mt-2 flex max-w-[80rem] flex-wrap items-center gap-2">
            {ordered.map((summary) => (
              <Button
                key={summary.slug}
                size="sm"
                variant="outline"
                onClick={() => resolvePending(summary.slug)}
              >
                Drop {summary.displayName}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={cancelPending}>
              Keep the current four
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-[80rem] items-center gap-4 px-6 py-3">
        <div className="flex items-center gap-2">
          {ordered.map((summary) => (
            <div key={summary.slug} className="group relative">
              <span className="block size-10 overflow-hidden rounded-full bg-stone">
                {summary.portraitUrl ? (
                  <Image
                    src={summary.portraitUrl}
                    alt={summary.displayName}
                    width={40}
                    height={40}
                    className="size-10 object-cover"
                  />
                ) : (
                  <span className="flex size-10 items-center justify-center font-display text-sm text-ink/45">
                    {initialsOf(summary.displayName)}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => remove(summary.slug)}
                aria-label={`Remove ${summary.displayName} from compare`}
                className="absolute -right-1 -top-1 rounded-full border border-hairline bg-surface p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>

        <p className="text-sm text-ink-muted">
          {slugs.length} selected
          {ready ? null : `, ${COMPARE_MIN - slugs.length} more to compare`}
        </p>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear all
          </Button>
          <Button asChild size="sm" disabled={!ready}>
            {ready ? (
              <Link href={`/compare?ids=${slugs.join(",")}`}>Compare</Link>
            ) : (
              <span aria-disabled>Compare</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
