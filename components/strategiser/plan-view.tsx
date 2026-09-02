"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUp } from "lucide-react";
import { useCompare } from "@/components/compare/compare-context";
import { PlatformIcon } from "@/components/platform-icon";
import { fitToBudget, computeTotals, swapPick } from "@/lib/strategiser/compute";
import {
  formatBdt,
  formatCompact,
  formatNumber,
  formatPercent,
  initialsOf,
  NO_DATA,
} from "@/lib/format";
import { PLATFORM_LABEL } from "@/lib/types";
import type { Brief, Candidate, Pick, Plan } from "@/lib/strategiser/types";

/**
 * The shortlist, as a reply rather than a report.
 *
 * One centred column the width of the prompt card, on the same dark canvas, so
 * scrolling from the brief into the answer crosses no seam. Blocks land in
 * order — summary, figures, then the creators — and once a block has landed it
 * is completely still.
 */
export function PlanView({
  plan: initial,
  brief,
  rosterEngagement,
  onStartOver,
  onRegenerate,
  onFollowUp,
  regenerating,
}: {
  plan: Plan;
  brief: Brief;
  rosterEngagement: number[];
  onStartOver: () => void;
  onRegenerate: () => void;
  onFollowUp: (text: string) => void;
  regenerating: boolean;
}) {
  const [picks, setPicks] = useState<Pick[]>(initial.picks);
  const [bench, setBench] = useState<Candidate[]>(initial.bench);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState("");
  const { add } = useCompare();

  const totals = computeTotals(picks, brief.budgetBdt, rosterEngagement);
  const over = totals.remaining < 0;
  const spentShare =
    totals.budget > 0 ? Math.min(100, Math.round((totals.spend / totals.budget) * 100)) : 0;

  if (initial.picks.length === 0) {
    return (
      <div className="space-y-4 py-12">
        <p className="text-base text-white">Nothing in the roster matched that brief.</p>
        <p className="max-w-[40rem] text-sm text-white/55">
          Widening the platforms, or describing the audience more loosely, is usually
          enough.
        </p>
        <button
          type="button"
          onClick={onStartOver}
          className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:border-white/30 hover:text-white"
        >
          Change the brief
        </button>
      </div>
    );
  }

  // 80ms apart, in the order a reader takes them in.
  let step = 0;
  const delay = () => ({ animationDelay: `${(step++ * 80).toFixed(0)}ms` });

  return (
    <div className="space-y-10">
      {initial.degraded ? (
        <p className="sg-reveal rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-white/70" style={delay()}>
          Showing a basic match, ranked on reach and engagement within your budget. The
          strategist is unavailable right now, so there are no written reasons below.
        </p>
      ) : null}

      {initial.widened.length > 0 ? (
        <p className="sg-reveal text-sm text-white/50" style={delay()}>
          Too few creators matched exactly, so {initial.widened.join(", then ")} was
          relaxed to fill the shortlist.
        </p>
      ) : null}

      {initial.strategySummary ? (
        <p className="sg-reveal text-lg leading-relaxed text-white/85" style={delay()}>
          {initial.strategySummary}
        </p>
      ) : null}

      {/* Budget */}
      <section className="sg-reveal space-y-3" style={delay()}>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
          role="img"
          aria-label={`${formatBdt(totals.spend)} of ${formatBdt(totals.budget)} committed`}
        >
          <div
            className={`sg-bar-fill h-full rounded-full ${over ? "bg-warn" : "bg-brand"}`}
            style={{ width: `${spentShare}%` }}
          />
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <Figure label="Committed" value={formatBdt(totals.spend)} accent />
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

        {totals.unpricedCount > 0 ? (
          <p className="text-sm text-white/45">
            {totals.pricedCount === 0
              ? "None of these creators has a rate on file, so this plan cannot be costed yet."
              : `Covers ${totals.pricedCount} of ${picks.length} creators. The other ${totals.unpricedCount} ${
                  totals.unpricedCount === 1 ? "has" : "have"
                } no rate on file and ${totals.unpricedCount === 1 ? "is" : "are"} not counted above.`}
          </p>
        ) : null}

        {over ? (
          <button
            type="button"
            onClick={() => {
              const next = fitToBudget(picks, bench, brief.budgetBdt);
              setPicks(next.picks);
              setBench(next.bench);
            }}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/80 hover:border-white/30 hover:text-white"
          >
            Fit to budget
          </button>
        ) : null}
      </section>

      <dl
        className="sg-reveal flex flex-wrap gap-x-10 gap-y-3 border-y border-white/10 py-5 text-sm"
        style={delay()}
      >
        <Figure label="Creators" value={formatNumber(picks.length)} />
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
                    : ` vs ${formatPercent(totals.rosterMedianEngagement, 1)} median`
                }`
          }
        />
      </dl>

      <ul className="space-y-4">
        {picks.map((pick) => (
          <li key={pick.candidate.id} className="sg-reveal" style={delay()}>
            <ResultCard
              pick={pick}
              swapping={swapFor === pick.candidate.id}
              bench={bench}
              onSwapOpen={() =>
                setSwapFor(swapFor === pick.candidate.id ? null : pick.candidate.id)
              }
              onSwap={(inId) => {
                const next = swapPick(picks, bench, pick.candidate.id, inId);
                setPicks(next.picks);
                setBench(next.bench);
                setSwapFor(null);
              }}
              onRemove={() => {
                setPicks(picks.filter((entry) => entry.candidate.id !== pick.candidate.id));
                setBench([pick.candidate, ...bench]);
              }}
            />
          </li>
        ))}
      </ul>

      {initial.tradeoffNote ? (
        <p className="text-sm leading-relaxed text-white/50">{initial.tradeoffNote}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-6">
        <Secondary
          href={`/api/compare/pdf?ids=${picks.map((p) => p.candidate.slug).join(",")}`}
        >
          Export as PDF
        </Secondary>
        <Secondary
          onClick={() => picks.forEach((p) => add(p.candidate.slug, p.candidate.name))}
        >
          Send all to compare
        </Secondary>
        <Secondary onClick={onRegenerate} disabled={regenerating}>
          {regenerating ? "Rebuilding" : "Try a different mix"}
        </Secondary>
        <Secondary onClick={onStartOver}>Start over</Secondary>
      </div>

      {/* The thread stays open, so the answer can be argued with. */}
      <form
        className="sticky bottom-4 flex items-center gap-2 rounded-2xl border border-white/15 bg-[#171311]/95 p-2 backdrop-blur-xl"
        onSubmit={(event) => {
          event.preventDefault();
          const text = followUp.trim();
          if (!text || regenerating) return;
          setFollowUp("");
          onFollowUp(text);
        }}
      >
        <input
          value={followUp}
          onChange={(event) => setFollowUp(event.target.value)}
          disabled={regenerating}
          placeholder="Make it cheaper, more TikTok, fewer creators…"
          aria-label="Refine this shortlist"
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[15px] text-white outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={!followUp.trim() || regenerating}
          aria-label="Send"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-white disabled:bg-white/10 disabled:text-white/30"
        >
          <ArrowUp className="size-4" />
        </button>
      </form>
    </div>
  );
}

/** Solid, unblurred. A price cannot sit on something the light shows through. */
function ResultCard({
  pick,
  bench,
  swapping,
  onSwapOpen,
  onSwap,
  onRemove,
}: {
  pick: Pick;
  bench: Candidate[];
  swapping: boolean;
  onSwapOpen: () => void;
  onSwap: (inId: string) => void;
  onRemove: () => void;
}) {
  const { candidate: creator } = pick;

  return (
    <article className="sg-solid rounded-2xl p-4">
      <div className="flex gap-4">
        <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-white/5">
          {creator.avatarUrl ? (
            <Image
              src={creator.avatarUrl}
              alt=""
              width={56}
              height={56}
              sizes="56px"
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center font-display text-sm text-white/40">
              {initialsOf(creator.name)}
            </span>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <Link
              href={`/creators/${creator.slug}`}
              className="truncate text-base text-white hover:underline"
            >
              {creator.name}
            </Link>
            {/* The one orange figure per card: what it costs. */}
            <span className="numeral shrink-0 text-sm text-brand">
              {creator.ratePerPost === null ? (
                <span className="text-white/40">No rate on file</span>
              ) : (
                formatBdt(creator.ratePerPost)
              )}
            </span>
          </div>

          <p className="mt-0.5 truncate text-sm text-white/45">
            {creator.handle ? `@${creator.handle}` : "Handle not on file"}
            {creator.category ? ` · ${creator.category}` : ""}
            {creator.city ? ` · ${creator.city}` : ""}
          </p>

          <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {creator.platforms.map((account) => (
              <div key={account.platform} className="flex items-center gap-1.5">
                <dt className="text-white/40">
                  <PlatformIcon platform={account.platform} className="size-3.5" />
                  <span className="sr-only">{PLATFORM_LABEL[account.platform]}</span>
                </dt>
                <dd className="numeral text-white/80">
                  {account.followers === null ? "—" : formatCompact(account.followers)}
                </dd>
              </div>
            ))}
            <Figure
              label="Engagement"
              value={
                creator.engagementRate === null
                  ? "Not on file"
                  : formatPercent(creator.engagementRate, 1)
              }
            />
            <Figure
              label="Score"
              value={
                creator.agencyScore === null
                  ? "Not on file"
                  : `${Math.round(creator.agencyScore)} / 100`
              }
            />
          </dl>
        </div>
      </div>

      {pick.reason ? (
        <p className="mt-4 border-l-2 border-white/15 pl-3 text-sm italic leading-relaxed text-white/60">
          {pick.reason}
        </p>
      ) : null}

      {pick.context ? (
        <p className="mt-3 rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/50">
          <span className="font-medium text-white/75">Gemini&rsquo;s own knowledge</span>
          <span className="block">
            {pick.context} Not from your records &mdash; verify before quoting it.
          </span>
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <button
          type="button"
          onClick={onSwapOpen}
          className="text-white/50 transition-colors hover:text-white"
        >
          {swapping ? "Cancel" : "Swap for similar"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="text-white/50 transition-colors hover:text-white"
        >
          Remove
        </button>
        <Link
          href={`/creators/${creator.slug}`}
          className="text-white/50 transition-colors hover:text-white"
        >
          View profile
        </Link>
      </div>

      {swapping ? (
        <ul className="mt-4 space-y-1 border-t border-white/10 pt-3">
          {bench.slice(0, 5).map((option) => (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => onSwap(option.id)}
                className="flex w-full items-baseline justify-between gap-4 rounded-lg px-2 py-1.5 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
              >
                <span className="truncate">{option.name}</span>
                <span className="numeral shrink-0 text-white/50">
                  {option.ratePerPost === null ? "No rate" : formatBdt(option.ratePerPost)}
                </span>
              </button>
            </li>
          ))}
          {bench.length === 0 ? (
            <li className="px-2 py-1.5 text-sm text-white/40">
              Nobody left in the pool to swap in.
            </li>
          ) : null}
        </ul>
      ) : null}
    </article>
  );
}

function Figure({
  label,
  value,
  tone = "default",
  accent = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "warn";
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-white/40">{label}</dt>
      <dd
        className={`numeral mt-0.5 ${
          tone === "warn" ? "text-warn" : accent ? "text-brand" : "text-white/85"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Secondary({
  children,
  href,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const className =
    "rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/75 transition-colors hover:border-white/30 hover:text-white disabled:opacity-40";
  if (href) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}
