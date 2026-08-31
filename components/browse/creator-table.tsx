"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompare } from "@/components/compare/compare-context";
import { formatCompact, formatBdt, NO_DATA } from "@/lib/format";
import {
  DATA_CONFIDENCE_LABEL,
  PLATFORM_LABEL,
  TIER_LABEL,
  type DataConfidence,
  type Platform,
  type Tier,
} from "@/lib/types";

export type TableRow = {
  slug: string;
  displayName: string;
  handle: string | null;
  platform: Platform | null;
  category: string | null;
  tier: Tier | null;
  followers: number | null;
  totalReach: number | null;
  engagementRate: number | null;
  engagementQualifier?: string;
  score: number | null;
  cheapestRate: number | null;
  city: string | null;
  dataConfidence: DataConfidence;
};

/**
 * The compact view, for scanning many creators at once. Table cells have no
 * radius, per the design direction, and every absent value reads "No data".
 */
export function CreatorTable({
  rows,
  canSeeRates,
}: {
  rows: TableRow[];
  canSeeRates: boolean;
}) {
  const { isSelected, toggle } = useCompare();

  return (
    <div className="overflow-x-auto pt-6">
      <table className="w-full min-w-[62rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-hairline text-left text-xs text-ink-muted">
            <th scope="col" className="w-9 py-2 pr-2">
              <span className="sr-only">Compare</span>
            </th>
            <th scope="col" className="py-2 pr-4 font-normal">Name</th>
            <th scope="col" className="py-2 pr-4 font-normal">Category</th>
            <th scope="col" className="py-2 pr-4 font-normal">Tier</th>
            <th scope="col" className="py-2 pr-4 text-right font-normal">Followers</th>
            <th scope="col" className="py-2 pr-4 text-right font-normal">Total reach</th>
            <th scope="col" className="py-2 pr-4 text-right font-normal">Engagement</th>
            <th scope="col" className="py-2 pr-4 text-right font-normal">Score</th>
            {canSeeRates ? (
              <th scope="col" className="py-2 pr-4 text-right font-normal">Cheapest rate</th>
            ) : null}
            <th scope="col" className="py-2 font-normal">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.slug} className="border-b border-hairline align-middle">
              <td className="py-2.5 pr-2">
                <Checkbox
                  checked={isSelected(row.slug)}
                  onCheckedChange={() => toggle(row.slug, row.displayName)}
                  aria-label={`Add ${row.displayName} to compare`}
                />
              </td>
              <td className="py-2.5 pr-4">
                <Link href={`/creators/${row.slug}`} className="hover:underline">
                  {row.displayName}
                </Link>
                <span className="block text-xs text-ink-muted">
                  {row.handle ? `@${row.handle}` : "Handle not on file"}
                  {row.platform ? ` on ${PLATFORM_LABEL[row.platform]}` : ""}
                </span>
              </td>
              <td className="py-2.5 pr-4">
                <Muted value={row.category} />
              </td>
              <td className="py-2.5 pr-4">
                <Muted value={row.tier ? TIER_LABEL[row.tier] : null} />
              </td>
              <td className="numeral py-2.5 pr-4 text-right">
                {formatCompact(row.followers)}
              </td>
              <td className="numeral py-2.5 pr-4 text-right">
                {formatCompact(row.totalReach)}
              </td>
              <td className="numeral py-2.5 pr-4 text-right">
                {row.engagementRate === null ? (
                  <span className="text-ink-muted">{NO_DATA}</span>
                ) : (
                  <>
                    {row.engagementRate.toFixed(2)}%
                    {row.engagementQualifier === "by_followers" ? (
                      <span className="block text-xs text-ink-muted">by followers</span>
                    ) : null}
                  </>
                )}
              </td>
              <td className="numeral py-2.5 pr-4 text-right">
                {row.score === null ? (
                  <span className="text-ink-muted">{NO_DATA}</span>
                ) : (
                  Math.round(row.score)
                )}
              </td>
              {canSeeRates ? (
                <td className="numeral py-2.5 pr-4 text-right">
                  {row.cheapestRate === null ? (
                    <span className="text-ink-muted">{NO_DATA}</span>
                  ) : (
                    formatBdt(row.cheapestRate)
                  )}
                </td>
              ) : null}
              <td className="py-2.5 text-xs text-ink-muted">
                {DATA_CONFIDENCE_LABEL[row.dataConfidence]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Muted({ value }: { value: string | null }) {
  return value ? <>{value}</> : <span className="text-ink-muted">{NO_DATA}</span>;
}
