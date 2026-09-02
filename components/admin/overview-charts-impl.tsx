"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatNumber } from "@/lib/format";
import type { SparkPoint } from "@/lib/db/overview";

const AXIS = { stroke: "var(--ink-muted)", fontSize: 12 };
const GRID = "var(--hairline)";

const TOOLTIP = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--hairline)",
    borderRadius: 8,
    fontSize: 12,
  },
  cursor: { fill: "var(--muted)" },
} as const;

/** Month key to a short label: 2026-09 becomes Sep. */
function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1).toLocaleString("en-US", { month: "short" });
}

/** Six months, one colour, no axes. Small enough to read as texture. */
export function Sparkline({ data }: { data: SparkPoint[] }) {
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
          <Tooltip
            {...TOOLTIP}
            labelFormatter={(label: unknown) => monthLabel(String(label))}
            formatter={(value: unknown) =>
              [formatNumber(Math.round(Number(value))), ""] as [string, string]
            }
          />
          <XAxis dataKey="month" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--ink-muted)"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Counts by category, drawn horizontally so the labels stay upright. */
export function CountBars({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  return (
    <div style={{ height: Math.max(160, data.length * 40 + 32) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
        >
          <CartesianGrid stroke={GRID} vertical horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(value: number) => formatNumber(value)}
            tickLine={false}
            axisLine={false}
            tick={AXIS}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={AXIS}
            width={88}
          />
          <Tooltip
            {...TOOLTIP}
            formatter={(value: unknown) =>
              [`${formatNumber(Number(value))} creators`, ""] as [string, string]
            }
          />
          <Bar
            dataKey="value"
            fill="var(--chart-1)"
            radius={[0, 2, 2, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Creators added per month over twelve months. One series, flat fill. */
export function GrowthArea({ data }: { data: SparkPoint[] }) {
  return (
    <div className="h-[240px] w-full min-w-[520px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={monthLabel}
            tickLine={false}
            axisLine={false}
            tick={AXIS}
            minTickGap={8}
          />
          <YAxis
            tickFormatter={(value: number) => formatCompact(value)}
            tickLine={false}
            axisLine={false}
            tick={AXIS}
            width={40}
            allowDecimals={false}
          />
          <Tooltip
            {...TOOLTIP}
            labelFormatter={(label: unknown) => monthLabel(String(label))}
            formatter={(value: unknown) =>
              [`${formatNumber(Number(value))} added`, ""] as [string, string]
            }
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--chart-1)"
            fill="var(--chart-4)"
            fillOpacity={0.45}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
