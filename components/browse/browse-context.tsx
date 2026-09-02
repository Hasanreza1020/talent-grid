"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useOptimistic,
  useTransition,
} from "react";
import { parseFilters, filtersToQuery, type BrowseFilters } from "@/lib/browse";

type BrowseState = {
  /** The filters to render controls from: optimistic, not the committed URL. */
  filters: BrowseFilters;
  /** True from the click until the new result set has been rendered. */
  isPending: boolean;
  push: (next: BrowseFilters) => void;
  update: (patch: Partial<BrowseFilters>) => void;
};

const BrowseContext = createContext<BrowseState | null>(null);

/**
 * One transition for the whole browse screen.
 *
 * The controls and the results have to move together on a filter click, and
 * they are on opposite sides of the server/client line: the rail is a client
 * component, the result set is server-rendered. Both read from here.
 *
 * A keyed Suspense boundary is not enough on its own. React will not replace
 * already-visible content with a fallback during a navigation transition —
 * that suppression is the entire point of a transition — so the previous
 * results sit there looking stale until the new ones land. Holding the pending
 * flag here and rendering the skeleton from it is explicit, and does not
 * depend on how Suspense and transitions happen to interact.
 */
export function BrowseProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const urlFilters = useMemo(
    () => parseFilters(Object.fromEntries(searchParams.entries())),
    [searchParams],
  );
  const [filters, showFilters] = useOptimistic(urlFilters);

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

  // Patches build on the optimistic filters, not the URL, so a second click
  // that lands before the first has returned keeps the first one.
  const update = useCallback(
    (patch: Partial<BrowseFilters>) => push({ ...filters, ...patch }),
    [filters, push],
  );

  const value = useMemo(
    () => ({ filters, isPending, push, update }),
    [filters, isPending, push, update],
  );

  return <BrowseContext.Provider value={value}>{children}</BrowseContext.Provider>;
}

export function useBrowse(): BrowseState {
  const state = useContext(BrowseContext);
  if (!state) throw new Error("useBrowse must be used inside a BrowseProvider");
  return state;
}
