"use client";

import { useEffect } from "react";
import { useCompare } from "./compare-context";

/**
 * Opening /compare?ids=a,b,c directly should fill the tray, so that a shared
 * comparison link behaves the same as one built by ticking boxes.
 */
export function CompareHydrator({ slugs }: { slugs: string[] }) {
  const { slugs: current, add } = useCompare();

  useEffect(() => {
    for (const slug of slugs) {
      if (!current.includes(slug)) add(slug, slug);
    }
    // Runs once per set of ids in the URL; the tray owns the state thereafter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs.join(",")]);

  return null;
}
