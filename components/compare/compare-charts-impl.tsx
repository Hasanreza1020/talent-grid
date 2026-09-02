"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompact } from "@/lib/format";
import { PLATFORM_LABEL, type Platform } from "@/lib/types";

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

export type Series = { key: string; name: string; color: string };

export type PlatformDatum = Record<string, number | null | Platform> & {
  platform: Platform;
};

export type CreatorDatum = {
  key: string;
  name: string;
  color: string;
  value: number | null;
};

/**
 * The anchor: followers per platform, one group per platform, one bar per
 * creator. Laid out horizontally because platform names read better as row
 * labels than as rotated ticks, and because it lets the group grow downward as
 * creators are added rather than squeezing sideways.
 */
export function FollowersByPlatform({
  data,
  series,
}: {
  data: PlatformDatum[];
  series: Series[];
}) {
  const height = Math.max(240, data.length * (series.length * 22 + 34) + 32);

  return (
    <div style={{ height }} className="w-full min-w-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          barGap={2}
          margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
        >
          <CartesianGrid stroke={GRID} vertical horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(value: number) => formatCompact(value)}
            tickLine={false}
            axisLine={false}
            tick={AXIS}
          />
          <YAxis
            type="category"
            dataKey="platform"
            tickFormatter={(value: Platform) => PLATFORM_LABEL[value]}
            tickLine={false}
            axisLine={false}
            tick={AXIS}
            width={82}
          />
          <Tooltip
            {...TOOLTIP}
            formatter={(value: unknown, name: unknown) =>
              [formatCompact(Number(value)), String(name)] as [string, string]
            }
            labelFormatter={(label: unknown) => PLATFORM_LABEL[label as Platform]}
          />
          {series.map((entry) => (
            <Bar
              key={entry.key}
              dataKey={entry.key}
              name={entry.name}
              fill={entry.color}
              radius={[0, 2, 2, 0]}
              isAnimationActive={false}
            >
              <LabelList
                dataKey={entry.key}
                position="right"
                fontSize={11}
                fill="var(--ink-muted)"
                formatter={(value: unknown) =>
                  value === null || value === undefined ? "" : formatCompact(Number(value))
                }
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * One horizontal bar per creator.
 *
 * Creators without the figure are not plotted at zero; they are named beneath
 * the chart instead, because a zero bar is a claim and an absence is the truth.
 */
export function HorizontalBars({
  data,
  format,
  missingLabel,
  reference = null,
  referenceLabel,
}: {
  data: CreatorDatum[];
  format: (value: number) => string;
  missingLabel: string;
  reference?: number | null;
  referenceLabel?: string;
}) {
  const present = data.filter((entry) => entry.value !== null);
  const missing = data.filter((entry) => entry.value === null);

  return (
    <div className="space-y-3">
      {present.length > 0 ? (
        <div style={{ height: Math.max(120, present.length * 44 + 40) }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={present}
              layout="vertical"
              margin={{ top: 4, right: 64, bottom: 4, left: 8 }}
            >
              <CartesianGrid stroke={GRID} vertical horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(value: number) => format(value)}
                tickLine={false}
                axisLine={false}
                tick={AXIS}
              />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={AXIS}
                width={96}
              />
              <Tooltip
                {...TOOLTIP}
                formatter={(value: unknown) => [format(Number(value)), ""] as [string, string]}
              />
              {reference !== null ? (
                <ReferenceLine
                  x={reference}
                  stroke="var(--ink-muted)"
                  strokeDasharray="4 4"
                  label={{
                    value: referenceLabel ?? "Median",
                    position: "top",
                    fill: "var(--ink-muted)",
                    fontSize: 11,
                  }}
                />
              ) : null}
              <Bar dataKey="value" radius={[0, 2, 2, 0]} isAnimationActive={false}>
                <LabelList
                  dataKey="value"
                  position="right"
                  fontSize={11}
                  fill="var(--ink-muted)"
                  formatter={(value: unknown) => format(Number(value))}
                />
                {present.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}

      {missing.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {missing.map((entry) => (
            <li
              key={entry.key}
              className="rounded-md border border-dashed border-hairline px-2.5 py-1 text-xs text-ink-muted"
            >
              <span
                aria-hidden
                className="mr-1.5 inline-block size-2 rounded-full align-middle"
                style={{ background: entry.color }}
              />
              {entry.name} &mdash; {missingLabel}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Agency score as a dot on a shared 0 to 100 track, one row per creator.
 *
 * A dot on a common scale rather than a filled bar: the score is a position
 * between two fixed ends, not a quantity accumulating from zero, and a bar
 * invites the eye to read length as amount.
 */
export function DotPlot({ data }: { data: CreatorDatum[] }) {
  return (
    <ul className="space-y-4">
      {data.map((entry) => (
        <li key={entry.key} className="grid grid-cols-[7rem_1fr_3.5rem] items-center gap-3">
          <span className="flex min-w-0 items-center gap-2 text-sm">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ background: entry.color }}
            />
            <span className="truncate">{entry.name}</span>
          </span>

          <span className="relative block h-4">
            <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-hairline" />
            {entry.value !== null ? (
              <span
                aria-hidden
                className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${Math.min(100, Math.max(0, entry.value))}%`,
                  background: entry.color,
                }}
              />
            ) : null}
          </span>

          <span className="numeral text-right text-sm">
            {entry.value === null ? (
              <span className="text-xs text-ink-muted">Not on file</span>
            ) : (
              Math.round(entry.value)
            )}
          </span>
        </li>
      ))}
      <li className="grid grid-cols-[7rem_1fr_3.5rem] gap-3 text-[11px] text-ink-muted">
        <span />
        <span className="flex justify-between">
          <span>0</span>
          <span>100</span>
        </span>
        <span />
      </li>
    </ul>
  );
}
