"use client";

import dynamic from "next/dynamic";

export type { RadarSeries } from "@/components/charts-impl";

/**
 * recharts is the largest single thing in the client bundle, and every chart
 * in the product sits below the fold on the page that renders it. Loading it
 * on demand keeps it off the first load; the charts arrive a moment later,
 * into a frame of exactly the height they will occupy, so nothing shifts.
 *
 * `ssr: false` is not a workaround here. ResponsiveContainer measures its
 * parent before it draws anything, so a server-rendered chart is an empty box
 * either way — this only stops us paying to render that box twice.
 */
function ChartFrame({ height }: { height: number }) {
  return <div aria-hidden className="w-full rounded-md bg-muted" style={{ height }} />;
}

export const FollowerTrend = dynamic(
  () => import("@/components/charts-impl").then((mod) => mod.FollowerTrend),
  { ssr: false, loading: () => <ChartFrame height={220} /> },
);

export const BenchmarkRadar = dynamic(
  () => import("@/components/charts-impl").then((mod) => mod.BenchmarkRadar),
  { ssr: false, loading: () => <ChartFrame height={300} /> },
);

export const AgeBracketChart = dynamic(
  () => import("@/components/charts-impl").then((mod) => mod.AgeBracketChart),
  { ssr: false, loading: () => <ChartFrame height={200} /> },
);
