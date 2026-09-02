import Link from "next/link";
import Image from "next/image";
import { getOverview, type OverviewMetric } from "@/lib/db/overview";
import { Sparkline, CountBars, GrowthArea } from "@/components/admin/overview-charts";
import { PlatformIcon } from "@/components/platform-icon";
import { Button } from "@/components/ui/button";
import {
  formatCompact,
  formatDate,
  formatNumber,
  formatPercent,
  initialsOf,
  NO_DATA,
} from "@/lib/format";
import { PLATFORM_LABEL, TIER_LABEL } from "@/lib/types";

export const metadata = { title: "Admin — Grid" };

const HEADER_ACTIONS = [
  { href: "/admin/creators/new", label: "Add creator", primary: true },
  { href: "/admin/import", label: "Import CSV", primary: false },
  { href: "/api/creators/summary", label: "Export roster", primary: false },
  { href: "/admin/taxonomy", label: "Manage categories", primary: false },
  { href: "/admin/creators", label: "Refresh stats", primary: false },
];

export default async function AdminDashboardPage() {
  const overview = await getOverview();

  if (overview.creatorCount === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-base">No creators added yet. Import a CSV to get started.</p>
        <Button asChild className="mt-6">
          <Link href="/admin/import">Import CSV</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="-mx-4 lg:-mx-8">
      <Band overview={overview} />

      {/* The content column rides up over the band's lower edge, so the band
          reads as a header the page sits on rather than a separate strip. */}
      <div className="relative z-10 -mt-16 space-y-10 px-4 pb-16 lg:px-8">
        <section aria-labelledby="key-metrics">
          <h2 id="key-metrics" className="sr-only">
            Key metrics
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {overview.metrics.map((metric) => (
              <MetricCard key={metric.key} metric={metric} />
            ))}
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="roster-health">
          <h2 id="roster-health" className="text-base">
            Roster health
          </h2>

          <div className="rounded-xl border border-hairline bg-surface p-6">
            <div className="flex items-baseline justify-between gap-4 text-sm">
              <span className="text-ink-muted">Complete profiles</span>
              <span className="numeral">
                {formatNumber(overview.health.complete)}
                <span className="text-ink-muted">
                  {" "}
                  of {formatNumber(overview.creatorCount)}
                </span>
              </span>
            </div>
            <div
              className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-stone"
              role="img"
              aria-label={`${formatNumber(overview.health.complete)} complete, ${formatNumber(overview.health.incomplete)} incomplete`}
            >
              <div
                className="h-full bg-ink"
                style={{
                  width: `${Math.round((overview.health.complete / overview.creatorCount) * 100)}%`,
                }}
              />
            </div>

            <ul className="mt-5 divide-y divide-hairline border-t border-hairline">
              {overview.health.rows.map((row) => (
                <li key={row.key}>
                  <Link
                    href={row.href}
                    className="flex items-center justify-between gap-4 py-3 text-sm hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    <span className="flex items-center gap-2.5">
                      <Dot tone={row.tone} />
                      {row.label}
                    </span>
                    <span className="numeral">{formatNumber(row.count)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Follower tier distribution">
            {overview.tiers.length === 0 ? (
              <Quiet>No follower counts on file, so no creator has a tier yet.</Quiet>
            ) : (
              <>
                <p className="sr-only">
                  {overview.tiers
                    .map((entry) => `${TIER_LABEL[entry.tier]}: ${entry.count}`)
                    .join(". ")}
                </p>
                <CountBars
                  data={overview.tiers.map((entry) => ({
                    label: TIER_LABEL[entry.tier],
                    value: entry.count,
                  }))}
                />
              </>
            )}
          </Card>

          <Card title="Platform split">
            <p className="sr-only">
              {overview.platforms
                .map((entry) => `${PLATFORM_LABEL[entry.platform]}: ${entry.count}`)
                .join(". ")}
            </p>
            <CountBars
              data={overview.platforms.map((entry) => ({
                label: PLATFORM_LABEL[entry.platform],
                value: entry.count,
              }))}
            />
          </Card>
        </section>

        <Card title="Needs attention">
          {overview.movers.length === 0 ? (
            <Quiet>
              No creator has moved more than ten percent since the last refresh. This
              fills in once there are two snapshots to compare.
            </Quiet>
          ) : (
            <ul className="divide-y divide-hairline">
              {overview.movers.map((mover) => (
                <li key={mover.slug}>
                  <Link
                    href={`/creators/${mover.slug}`}
                    className="flex items-center justify-between gap-4 py-3 text-sm hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    <span className="truncate">{mover.name}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-ink-muted">{mover.metric}</span>
                      <span
                        className={
                          mover.deltaPercent < 0
                            ? "numeral text-warn"
                            : "numeral text-ink"
                        }
                      >
                        {mover.deltaPercent > 0 ? "+" : ""}
                        {mover.deltaPercent.toFixed(1)}%
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Growth over time" note="Creators added per month, last twelve months.">
          <p className="sr-only">
            {overview.growth.map((point) => `${point.month}: ${point.value}`).join(". ")}
          </p>
          <div className="overflow-x-auto">
            <GrowthArea data={overview.growth} />
          </div>
        </Card>

        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-base">Recently added</h2>
            <Link
              href="/admin/creators"
              className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline"
            >
              View all
            </Link>
          </div>

          <div className="overflow-x-auto rounded-xl border border-hairline bg-surface">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-ink-muted">
                  <th className="px-4 py-3 font-normal">Creator</th>
                  <th className="px-4 py-3 font-normal">Category</th>
                  <th className="px-4 py-3 text-right font-normal">Followers</th>
                  <th className="px-4 py-3 font-normal">Platforms</th>
                  <th className="px-4 py-3 text-right font-normal">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {overview.recent.map((row) => (
                  <tr key={row.slug} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/creators/${row.slug}`}
                        className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                      >
                        <span className="size-7 shrink-0 overflow-hidden rounded-full bg-stone">
                          {row.portraitUrl ? (
                            <Image
                              src={row.portraitUrl}
                              alt=""
                              width={28}
                              height={28}
                              sizes="28px"
                              className="size-full object-cover"
                            />
                          ) : (
                            <span className="flex size-full items-center justify-center font-display text-[10px] text-ink/45">
                              {initialsOf(row.name)}
                            </span>
                          )}
                        </span>
                        <span className="truncate">{row.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">
                      {row.category ?? "Not on file"}
                    </td>
                    <td className="numeral px-4 py-2.5 text-right">
                      {row.followers === null ? (
                        <span className="text-xs text-ink-muted">Not on file</span>
                      ) : (
                        formatCompact(row.followers)
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5 text-ink-muted">
                        {row.platforms.map((platform) => (
                          <span key={platform}>
                            <PlatformIcon platform={platform} className="size-4" />
                            <span className="sr-only">{PLATFORM_LABEL[platform]}</span>
                          </span>
                        ))}
                      </span>
                    </td>
                    <td className="numeral px-4 py-2.5 text-right text-ink-muted">
                      {formatDate(row.addedOn)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Band({ overview }: { overview: Awaited<ReturnType<typeof getOverview>> }) {
  return (
    <header className="relative overflow-hidden bg-ink px-4 pb-28 pt-10 text-white lg:px-8">
      {/*
        The only texture on the page, and it earns it by being the roster
        itself. Grayscale under a heavy ink wash so no face competes with the
        copy; if the images fail the band is simply the flat ink surface it
        already is.
      */}
      <div aria-hidden className="absolute inset-0">
        <div className="flex h-full flex-wrap content-start opacity-100">
          {overview.bandPortraits.map((url, index) => (
            <span key={`${url}-${index}`} className="block size-16 shrink-0 sm:size-20">
              <Image
                src={url}
                alt=""
                width={80}
                height={80}
                sizes="80px"
                loading="lazy"
                className="size-full object-cover grayscale"
              />
            </span>
          ))}
        </div>
        <div className="absolute inset-0 bg-ink/85" />
      </div>

      <div className="relative">
        <h1 className="max-w-[36rem] font-display text-2xl leading-tight">
          {formatNumber(overview.creatorCount)} creators
          {overview.combinedReach !== null
            ? `, ${formatCompact(Math.round(overview.combinedReach))} combined reach`
            : ""}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          {overview.lastRefresh
            ? `Stats last refreshed ${formatDate(overview.lastRefresh)}.`
            : "No follower snapshot has been recorded yet."}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {HEADER_ACTIONS.map((action) =>
            action.primary ? (
              <Button key={action.href} asChild size="sm">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <Button
                key={action.href}
                asChild
                variant="outline"
                size="sm"
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ),
          )}
        </div>
      </div>
    </header>
  );
}

function MetricCard({ metric }: { metric: OverviewMetric }) {
  const shown =
    metric.value === null
      ? NO_DATA
      : metric.format === "compact"
        ? formatCompact(metric.value)
        : metric.format === "percent"
          ? formatPercent(metric.value, 1)
          : formatNumber(metric.value);

  return (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <p className="text-xs text-ink-muted">{metric.label}</p>
      <p className="numeral mt-2 text-2xl leading-none">{shown}</p>

      {metric.changePercent !== null ? (
        <p className="numeral mt-2 text-xs text-ink-muted">
          {metric.changePercent > 0 ? "+" : ""}
          {metric.changePercent.toFixed(1)}% over six months
        </p>
      ) : null}

      <div className="mt-3">
        {metric.spark ? (
          <Sparkline data={metric.spark} />
        ) : (
          <p className="text-xs leading-snug text-ink-muted">{metric.note}</p>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-hairline bg-surface p-6">
      <h2 className="text-base">{title}</h2>
      {note ? <p className="mt-1 text-xs text-ink-muted">{note}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-sm text-ink-muted">{children}</p>;
}

function Dot({ tone }: { tone: "amber" | "red" | "green" }) {
  const palette = {
    amber: "bg-[#B45309]",
    red: "bg-warn",
    green: "bg-[#0F766E]",
  }[tone];
  return <span aria-hidden className={`size-2 shrink-0 rounded-full ${palette}`} />;
}
