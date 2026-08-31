"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact, formatDate } from "@/lib/format";

const AXIS = { stroke: "var(--ink-muted)", fontSize: 12 };
const GRID = "var(--hairline)";

/** Follower history for one account. Needs at least two points to be a trend. */
export function FollowerTrend({
  data,
}: {
  data: { capturedOn: string; followers: number }[];
}) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis
            dataKey="capturedOn"
            tickFormatter={(value: string) => formatDate(value)}
            tickLine={false}
            axisLine={{ stroke: GRID }}
            tick={AXIS}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(value: number) => formatCompact(value)}
            tickLine={false}
            axisLine={false}
            tick={AXIS}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(label: unknown) => formatDate(String(label))}
            formatter={(value: unknown) => [Number(value).toLocaleString(), "Followers"] as [string, string]}
          />
          <Line
            type="monotone"
            dataKey="followers"
            stroke="var(--ink)"
            strokeWidth={1.5}
            dot={{ r: 2.5, fill: "var(--ink)" }}
            activeDot={{ r: 4, fill: "var(--brand)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export type RadarSeries = {
  key: string;
  label: string;
  values: Record<string, number | null>;
};

/**
 * Normalised comparison across the five benchmark axes. Series are drawn in
 * neutral tones; the accent is reserved for whichever series is hovered.
 */
export function BenchmarkRadar({
  axes,
  series,
  highlightKey,
}: {
  axes: { key: string; label: string }[];
  series: RadarSeries[];
  highlightKey?: string | null;
}) {
  const data = axes.map((axis) => {
    const point: Record<string, string | number | null> = { axis: axis.label };
    for (const entry of series) point[entry.key] = entry.values[axis.key];
    return point;
  });

  const neutrals = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
  ];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={GRID} />
          <PolarAngleAxis dataKey="axis" tick={AXIS} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {series.map((entry, index) => {
            const highlighted = highlightKey === entry.key;
            return (
              <Radar
                key={entry.key}
                name={entry.label}
                dataKey={entry.key}
                stroke={highlighted ? "var(--brand)" : neutrals[index % neutrals.length]}
                fill={highlighted ? "var(--brand)" : neutrals[index % neutrals.length]}
                fillOpacity={highlighted ? 0.16 : 0.08}
                strokeWidth={highlighted ? 2 : 1.25}
              />
            );
          })}
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: unknown, name: unknown) =>
              [
                value === null || value === undefined
                  ? "No data"
                  : `${Math.round(Number(value))}th percentile`,
                String(name),
              ] as [string, string]
            }
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Audience age brackets. */
export function AgeBracketChart({
  data,
}: {
  data: { bracket: string; percent: number }[];
}) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="bracket" tickLine={false} axisLine={{ stroke: GRID }} tick={AXIS} />
          <YAxis
            tickFormatter={(value: number) => `${value}%`}
            tickLine={false}
            axisLine={false}
            tick={AXIS}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: unknown) => [`${Number(value)}%`, "Share of audience"] as [string, string]}
          />
          <Bar dataKey="percent" fill="var(--ink)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
