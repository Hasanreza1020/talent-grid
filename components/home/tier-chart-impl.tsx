"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { stroke: "var(--ink-muted)", fontSize: 12 };
const GRID = "var(--hairline)";

const TOOLTIP_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--hairline)",
  borderRadius: 8,
  fontSize: 12,
} as const;

export type TierDatum = { tier: string; range: string; creators: number };

/**
 * A single-series count, so it takes one hue rather than a categorical
 * palette, and needs no legend: the heading names the series. The accent is
 * not encoding anything here — it marks the single largest bar, which is a
 * pointer, not a category.
 */
export function TierChart({ tiers }: { tiers: TierDatum[] }) {
  const busiestTier = Math.max(...tiers.map((tier) => tier.creators));

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={tiers} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="tier" tickLine={false} axisLine={{ stroke: GRID }} tick={AXIS} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={AXIS}
            width={32}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)" }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: unknown) =>
              [`${Number(value)} creators`, "In this tier"] as [string, string]
            }
            labelFormatter={(label: unknown) => {
              const match = tiers.find((tier) => tier.tier === String(label));
              return match ? `${match.tier} — ${match.range}` : String(label);
            }}
          />
          <Bar dataKey="creators" radius={[4, 4, 0, 0]}>
            {tiers.map((tier) => (
              <Cell
                key={tier.tier}
                fill={tier.creators === busiestTier ? "var(--brand)" : "var(--ink)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
