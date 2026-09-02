import { PlatformIcon } from "@/components/platform-icon";
import { TierChart, type TierDatum } from "@/components/home/tier-chart";
import { formatCompact, formatNumber } from "@/lib/format";
import type { Platform } from "@/lib/types";

export type { TierDatum };
export type PlatformDatum = {
  platform: Platform;
  label: string;
  creators: number;
  reach: number | null;
};

/**
 * One magnitude chart, a platform read-out and a completeness read-out. Only
 * the chart needs the browser, so only the chart crosses into the client
 * bundle; the two read-outs are rendered on the server as the static markup
 * they are.
 */
export function ByTheNumbers({
  tiers,
  platforms,
  completeness,
}: {
  tiers: TierDatum[];
  platforms: PlatformDatum[];
  completeness: { label: string; done: number; total: number }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <section>
        <h3 className="text-base">Creators by tier</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Tier comes from the highest follower count on any of a creator&rsquo;s
          accounts, so it moves on its own as the numbers are updated.
        </p>
        <div className="mt-4">
          <TierChart tiers={tiers} />
        </div>
      </section>

      <section>
        <h3 className="text-base">Where they are</h3>
        <p className="mt-1 text-sm text-ink-muted">
          How many creators the agency can reach on each platform, and the combined
          following recorded there.
        </p>

        <dl className="mt-4 divide-y divide-hairline border-y border-hairline">
          {platforms.map((platform) => (
            <div
              key={platform.platform}
              className="flex items-center gap-4 py-3"
            >
              <dt className="flex min-w-[7.5rem] items-center gap-2 text-sm">
                <PlatformIcon platform={platform.platform} className="size-4" />
                {platform.label}
              </dt>
              <dd className="flex flex-1 items-center justify-between gap-4">
                <span className="numeral text-base">
                  {formatNumber(platform.creators)}
                  <span className="ml-1 text-xs text-ink-muted">creators</span>
                </span>
                <span className="numeral text-base">
                  {platform.reach === null ? (
                    <span className="text-sm text-ink-muted">No data</span>
                  ) : (
                    <>
                      {formatCompact(platform.reach)}
                      <span className="ml-1 text-xs text-ink-muted">reach</span>
                    </>
                  )}
                </span>
              </dd>
            </div>
          ))}
        </dl>

        <h3 className="mt-8 text-base">What is still missing</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Nothing here is filled in automatically. A gap stays a gap until someone
          records the real figure.
        </p>
        <dl className="mt-4 space-y-3">
          {completeness.map((item) => {
            const percent = item.total === 0 ? 0 : (item.done / item.total) * 100;
            return (
              <div key={item.label}>
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <dt className="text-ink-muted">{item.label}</dt>
                  <dd className="numeral">
                    {formatNumber(item.done)}
                    <span className="text-ink-muted"> of {formatNumber(item.total)}</span>
                  </dd>
                </div>
                <div
                  className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-stone"
                  role="img"
                  aria-label={`${item.label}: ${Math.round(percent)} percent`}
                >
                  <div
                    className="h-full rounded-full bg-ink"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </dl>
      </section>
    </div>
  );
}
