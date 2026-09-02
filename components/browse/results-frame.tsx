"use client";

import { useBrowse } from "@/components/browse/browse-context";
import { ResultsSkeleton } from "@/components/browse/results-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Swaps the server-rendered result set for the skeleton the moment a filter is
 * clicked, rather than leaving the previous set on screen until the new one
 * arrives. Stale rows that still respond to hover read as a broken page; a
 * skeleton reads as work in progress.
 */
export function ResultsFrame({ children }: { children: React.ReactNode }) {
  const { filters, isPending } = useBrowse();
  if (isPending) return <ResultsSkeleton view={filters.view} />;
  return <>{children}</>;
}

/** The same swap for the count, which is wrong the instant a filter changes. */
export function CountFrame({ children }: { children: React.ReactNode }) {
  const { isPending } = useBrowse();
  if (isPending) return <Skeleton className="inline-block h-5 w-32 align-middle" />;
  return <>{children}</>;
}
