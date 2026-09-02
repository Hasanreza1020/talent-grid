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
import { formatCompact, formatNumber } from "@/lib/format";
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

/** Followers per platform, grouped by platform with one bar per creator. */
export function FollowersByPlatform({
  data,
  series,
}: {
  data: PlatformDatum[];
  series: Series[];
}) {
  return (
    <div style={{ height: Math.max(200, data.length * 68 + 40) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
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
            width={78}
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
              radius={[0, 3, 3, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type CreatorDatum = {
  key: string;
  name: string;
  color: string;
  value: number | null;
};

/**
 * One bar per creator.
 *
 * Creators whose figure is not on file are listed beneath the chart rather than
 * drawn at zero. A zero bar is a claim about a creator; an absence is the truth
 * here, and the reader needs to see which names it applies to before drawing a
 * conclusion from the ones that remain.
 */
export function PerCreatorBars({
  data,
  format,
  missingLabel,
  median = null,
}: {
  data: CreatorDatum[];
  format: (value: number) => string;
  missingLabel: string;
  median?: number | null;
}) {
  const present = data.filter((entry) => entry.value !== null);
  const missing = data.filter((entry) => entry.value === null);

  return (
    <div className="space-y-3">
      {present.length > 0 ? (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={present} margin={{ top: 20, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={AXIS} />
              <YAxis
                tickFormatter={(value: number) => format(value)}
                tickLine={false}
                axisLine={false}
                tick={AXIS}
                width={64}
              />
              <Tooltip
                {...TOOLTIP}
                formatter={(value: unknown) =>
                  [format(Number(value)), ""] as [string, string]
                }
              />
              {median !== null ? (
                <ReferenceLine
                  y={median}
                  stroke="var(--ink-muted)"
                  strokeDasharray="4 4"
                  label={{
                    value: "Roster median",
                    position: "insideTopRight",
                    fill: "var(--ink-muted)",
                    fontSize: 11,
                  }}
                />
              ) : null}
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                <LabelList
                  dataKey="value"
                  position="top"
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

/** Agency score: one progress row per creator, 0 to 100. */
export function ScoreBars({ data }: { data: CreatorDatum[] }) {
  return (
    <ul className="space-y-4">
      {data.map((entry) => (
        <li key={entry.key}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ background: entry.color }}
              />
              <span className="truncate">{entry.name}</span>
            </span>
            <span className="numeral shrink-0">
              {entry.value === null ? (
                <span className="text-xs text-ink-muted">Not scored</span>
              ) : (
                <>
                  {formatNumber(Math.round(entry.value))}
                  <span className="text-ink-muted"> / 100</span>
                </>
              )}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone">
            {entry.value === null ? null : (
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, entry.value))}%`,
                  background: entry.color,
                }}
              />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
