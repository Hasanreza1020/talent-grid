"use client";

import dynamic from "next/dynamic";

export type { TierDatum } from "@/components/home/tier-chart-impl";

/**
 * The only chart on the home page, well below the fold, and the only reason
 * recharts would otherwise land in the first load of the busiest route. See
 * `components/charts.tsx` for the same arrangement and the reasoning behind
 * `ssr: false`.
 */
export const TierChart = dynamic(
  () => import("@/components/home/tier-chart-impl").then((mod) => mod.TierChart),
  {
    ssr: false,
    loading: () => <div aria-hidden className="h-[220px] w-full rounded-md bg-muted" />,
  },
);
