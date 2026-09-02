"use client";

import dynamic from "next/dynamic";

export type { Series, CreatorDatum, PlatformDatum } from "./compare-charts-impl";

/**
 * recharts stays out of the first load of /compare, the same way it does
 * everywhere else in the product. Nothing here is drawn until Compare has been
 * pressed, so on a visit that never gets that far it is never fetched at all.
 */
function frame(height: number) {
  const Frame = () => (
    <div aria-hidden className="w-full rounded-md bg-muted" style={{ height }} />
  );
  Frame.displayName = "ChartFrame";
  return Frame;
}

export const FollowersByPlatform = dynamic(
  () => import("./compare-charts-impl").then((mod) => mod.FollowersByPlatform),
  { ssr: false, loading: frame(240) },
);

export const PerCreatorBars = dynamic(
  () => import("./compare-charts-impl").then((mod) => mod.PerCreatorBars),
  { ssr: false, loading: frame(220) },
);

export const ScoreBars = dynamic(
  () => import("./compare-charts-impl").then((mod) => mod.ScoreBars),
  { ssr: false, loading: frame(160) },
);
