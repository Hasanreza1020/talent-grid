"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export const COMPARE_MIN = 2;
export const COMPARE_MAX = 4;

const STORAGE_KEY = "talent-grid.compare";

type PendingAddition = { slug: string; displayName: string } | null;

type CompareState = {
  slugs: string[];
  /** Set when a fifth creator was offered and a choice is required. */
  pending: PendingAddition;
  isSelected: (slug: string) => boolean;
  toggle: (slug: string, displayName: string) => void;
  add: (slug: string, displayName: string) => void;
  remove: (slug: string) => void;
  clear: () => void;
  /** Accept the pending addition by dropping the named slug. */
  resolvePending: (slugToDrop: string) => void;
  cancelPending: () => void;
};

const CompareContext = createContext<CompareState | null>(null);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingAddition>(null);

  // The tray persists across navigation within the session, which is what
  // sessionStorage means: it survives route changes and reloads, and is gone
  // when the tab closes.
  useEffect(() => {
    try {
      const stored = window.sessionStorage.getItem(STORAGE_KEY);
      if (stored) setSlugs(JSON.parse(stored));
    } catch {
      // Private mode or blocked storage. The tray still works for this page.
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    } catch {
      // Nothing to do: persistence is a convenience, not a requirement.
    }
  }, [slugs]);

  const add = useCallback((slug: string, displayName: string) => {
    setSlugs((current) => {
      if (current.includes(slug)) return current;
      if (current.length >= COMPARE_MAX) {
        // A fifth selection never silently replaces one. The caller is asked
        // which to drop.
        setPending({ slug, displayName });
        return current;
      }
      return [...current, slug];
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setSlugs((current) => current.filter((entry) => entry !== slug));
  }, []);

  const value = useMemo<CompareState>(
    () => ({
      slugs,
      pending,
      isSelected: (slug) => slugs.includes(slug),
      add,
      remove,
      toggle: (slug, displayName) => {
        if (slugs.includes(slug)) remove(slug);
        else add(slug, displayName);
      },
      clear: () => {
        setSlugs([]);
        setPending(null);
      },
      resolvePending: (slugToDrop) => {
        setPending((current) => {
          if (!current) return null;
          setSlugs((existing) => [
            ...existing.filter((entry) => entry !== slugToDrop),
            current.slug,
          ]);
          return null;
        });
      },
      cancelPending: () => setPending(null),
    }),
    [slugs, pending, add, remove],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareState {
  const context = useContext(CompareContext);
  if (!context) throw new Error("useCompare must be used inside CompareProvider");
  return context;
}
