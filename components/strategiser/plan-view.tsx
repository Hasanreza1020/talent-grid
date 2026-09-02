"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CreatorCard } from "@/components/creator/creator-card";
import { useCompare } from "@/components/compare/compare-context";
import { fitToBudget, computeTotals, swapPick } from "@/lib/strategiser/compute";
import { formatBdt, formatCompact, formatNumber, formatPercent, NO_DATA } from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/types";
import type { CardData } from "@/lib/card";
import type { Brief, Candidate, Pick, Plan } from "@/lib/strategiser/types";

/** The strategiser reuses the browse card rather than inventing a third one. */
function toCardData(candidate: Candidate): CardData {
  return {
    slug: candidate.slug,
    displayName: candidate.name,
    portraitUrl: candidate.avatarUrl,
    primaryHandle: candidate.handle,
    primaryPlatformLabel: candidate.platforms[0]
      ? PLATFORM_LABEL[candidate.platforms[0].platform]
      : null,
    primaryCategoryName: candidate.category,
    followers: candidate.totalReach,
    engagementRate: candidate.engagementRate,
    engagementLabel: "Engagement rate",
    tagLabels: [],
    accounts: candidate.platforms.map((entry) => ({
      platform: entry.platform,
      platformLabel: PLATFORM_LABEL[entry.platform],
      handle: null,
      followers: entry.followers,
      isPrimary: false,
    })),
  };
}

export function PlanView({
  plan: initial,
  brief,
  rosterEngagement,
  onStartOver,
  onRegenerate,
  regenerating,
}: {
  plan: Plan;
  brief: Brief;
  rosterEngagement: number[];
  onStartOver: () => void;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const [picks, setPicks] = useState<Pick[]>(initial.picks);
  const [bench, setBench] = useState<Candidate[]>(initial.bench);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const { add } = useCompare();

  // Recomputed in code on every change. No second model call, no stale figure.
  const totals = computeTotals(picks, brief.budgetBdt, rosterEngagement);
  const over = totals.remaining < 0;
  const spentShare = totals.budget > 0
    ? Math.min(100, Math.round((totals.spend / totals.budget) * 100))
    : 0;

  if (initial.picks.length === 0) {
    return (
      <div className="space-y-4 py-12">
        <p className="text-base">
          No creators match that brief closely enough to build a plan.
        </p>
        <p className="max-w-[40rem] text-sm text-ink-muted">
          Every creator in a plan needs a rate on file, because a shortlist that
          cannot be costed is not a plan. Widening the platforms or raising the
          budget is usually enough.
        </p>
        <Button variant="outline" size="sm" onClick={onStartOver}>
          Change the brief
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {initial.degraded ? (
        <p className="rounded-lg border border-hairline bg-muted px-4 py-3 text-sm">
          Showing a basic match, ranked on engagement and score within your budget. The
          strategist is unavailable right now, so there are no written reasons below.
        </p>
      ) : null}

      {initial.widened.length > 0 ? (
        <p className="text-sm text-ink-muted">
          Too few creators matched exactly, so {initial.widened.join(", then ")} was
          relaxed to fill the shortlist.
        </p>
      ) : null}

      {initial.strategySummary ? (
        <p className="max-w-[46rem] text-lg leading-relaxed">{initial.strategySummary}</p>
      ) : null}

      {/* Budget */}
      <section className="space-y-3">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-stone"
          role="img"
          aria-label={`${formatBdt(totals.spend)} of ${formatBdt(totals.budget)} committed`}
        >
          <div
            className={`h-full rounded-full ${over ? "bg-warn" : "bg-ink"}`}
            style={{ width: `${spentShare}%` }}
          />
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <Figure label="Committed" value={formatBdt(totals.spend)} />
          <Figure
            label={over ? "Over budget" : "Remaining"}
            value={formatBdt(Math.abs(totals.remaining))}
            tone={over ? "warn" : "default"}
          />
          <Figure
            label="Cost per 1,000 reach"
            value={
              totals.costPerThousandReach === null
                ? NO_DATA
                : `BDT ${totals.costPerThousandReach.toFixed(2)}`
            }
          />
        </dl>

        {over ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const next = fitToBudget(picks, bench, brief.budgetBdt);
              setPicks(next.picks);
              setBench(next.bench);
            }}
          >
            Fit to budget
          </Button>
        ) : null}
      </section>

      {/* Headline figures */}
      <dl className="flex flex-wrap gap-x-10 gap-y-3 border-y border-hairline py-5 text-sm">
        <Figure label="Creators selected" value={formatNumber(picks.length)} />
        <Figure
          label="Combined reach"
          value={totals.combinedReach === null ? NO_DATA : formatCompact(totals.combinedReach)}
        />
        <Figure
          label="Average engagement"
          value={
            totals.averageEngagement === null
              ? NO_DATA
              : `${formatPercent(totals.averageEngagement, 1)}${
                  totals.rosterMedianEngagement === null
                    ? ""
                    : ` vs ${formatPercent(totals.rosterMedianEngagement, 1)} roster median`
                }`
          }
        />
      </dl>

      {/* The shortlist */}
      <ul className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map((pick) => (
          <li key={pick.candidate.id} className="space-y-3">
            <CreatorCard data={toCardData(pick.candidate)} />

            <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <Figure label="Price per post" value={formatBdt(pick.candidate.ratePerPost)} />
              <Figure
                label="Agency score"
                value={
                  pick.candidate.agencyScore === null
                    ? "Not on file"
                    : `${Math.round(pick.candidate.agencyScore)} / 100`
                }
              />
            </dl>

            {pick.reason ? (
              // Indented and quieter than the figures above, because it is
              // commentary from a model rather than something on record.
              <p className="border-l-2 border-hairline pl-3 text-sm italic text-ink-muted">
                {pick.reason}
              </p>
            ) : null}

            {pick.candidate.stale ? (
              <p className="text-xs text-ink-muted">
                Figures last refreshed over 90 days ago.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-ink-muted hover:text-ink"
                onClick={() =>
                  setPicks((current) =>
                    current.filter((entry) => entry.candidate.id !== pick.candidate.id),
                  )
                }
              >
                Remove
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-ink-muted hover:text-ink"
                onClick={() =>
                  setSwapFor(swapFor === pick.candidate.id ? null : pick.candidate.id)
                }
              >
                Swap for similar
              </Button>
              <Button asChild variant="ghost" size="sm" className="text-ink-muted hover:text-ink">
                <Link href={`/creators/${pick.candidate.slug}`}>View profile</Link>
              </Button>
            </div>

            {swapFor === pick.candidate.id ? (
              <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-surface">
                {bench.slice(0, 5).map((option) => (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => {
                        const next = swapPick(picks, bench, pick.candidate.id, option.id);
                        setPicks(next.picks);
                        setBench(next.bench);
                        setSwapFor(null);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <span className="min-w-0 truncate">{option.name}</span>
                      <span className="flex shrink-0 items-center gap-3 text-xs text-ink-muted">
                        <span className="numeral">{formatBdt(option.ratePerPost)}</span>
                        <span className="numeral">
                          {option.engagementRate === null
                            ? NO_DATA
                            : formatPercent(option.engagementRate, 1)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
                {bench.length === 0 ? (
                  <li className="px-3 py-2.5 text-sm text-ink-muted">
                    Nobody else in this pool matches the brief.
                  </li>
                ) : null}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      {initial.tradeoffNote ? (
        <p className="max-w-[46rem] text-sm text-ink-muted">{initial.tradeoffNote}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-6">
        <Button asChild variant="outline" size="sm">
          <a href={`/api/compare/pdf?ids=${picks.map((p) => p.candidate.slug).join(",")}`}>
            Export as PDF
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            for (const pick of picks.slice(0, 4)) {
              add(pick.candidate.slug, pick.candidate.name);
            }
          }}
        >
          Send first four to compare
        </Button>
        <Button variant="outline" size="sm" onClick={onRegenerate} disabled={regenerating}>
          {regenerating ? "Rebuilding" : "Try a different mix"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onStartOver}>
          Start over
        </Button>
      </div>
    </div>
  );
}

function Figure({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`numeral mt-0.5 ${tone === "warn" ? "text-warn" : ""}`}>{value}</dd>
    </div>
  );
}
