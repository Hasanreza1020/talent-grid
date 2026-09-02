"use client";

import dynamic from "next/dynamic";

/**
 * The same split used everywhere else: recharts is fetched after the dashboard
 * has painted, not before it. The frames below are the heights the charts land
 * at, so the page does not move when they arrive.
 */
function frame(height: number) {
  const Frame = () => (
    <div aria-hidden className="w-full rounded-md bg-muted" style={{ height }} />
  );
  Frame.displayName = "ChartFrame";
  return Frame;
}

export const Sparkline = dynamic(
  () => import("./overview-charts-impl").then((mod) => mod.Sparkline),
  { ssr: false, loading: frame(40) },
);

export const CountBars = dynamic(
  () => import("./overview-charts-impl").then((mod) => mod.CountBars),
  { ssr: false, loading: frame(180) },
);

export const GrowthArea = dynamic(
  () => import("./overview-charts-impl").then((mod) => mod.GrowthArea),
  { ssr: false, loading: frame(240) },
);
