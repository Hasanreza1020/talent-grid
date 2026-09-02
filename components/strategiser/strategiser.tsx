"use client";

import { useState, useTransition } from "react";
import { HeroLights } from "./hero-lights";
import { PromptCard } from "./prompt-card";
import { StageLabels } from "./stage-labels";
import { ThreadView } from "./thread-view";
import { PlanView } from "./plan-view";
import { gatherAction, generatePlan } from "@/app/(app)/strategiser/actions";
import { formatBdt } from "@/lib/format";
import {
  EMPTY_SLOTS,
  MAX_QUESTIONS,
  type Brief,
  type Plan,
  type Slots,
  type Turn,
} from "@/lib/strategiser/types";

type Phase = "prompt" | "gathering" | "plan";

export function Strategiser({
  cheapestRate,
  rosterSize,
  rosterEngagement,
}: {
  cheapestRate: number | null;
  rosterSize: number;
  rosterEngagement: number[];
}) {
  const [phase, setPhase] = useState<Phase>("prompt");
  const [draft, setDraft] = useState("");
  const [thread, setThread] = useState<Turn[]>([]);
  const [slots, setSlots] = useState<Slots>(EMPTY_SLOTS);
  const [question, setQuestion] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [asked, setAsked] = useState(0);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<{ plan: Plan; brief: Brief } | null>(null);
  const [stage, setStage] = useState(0);
  const [building, setBuilding] = useState(false);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setPhase("prompt");
    setDraft("");
    setThread([]);
    setSlots(EMPTY_SLOTS);
    setQuestion(null);
    setQuickReplies([]);
    setAsked(0);
    setAssumptions([]);
    setNotice(null);
    setResult(null);
    setBuilding(false);
  };

  /**
   * A budget that cannot buy anyone is caught before the pipeline runs. It is
   * a question, not an error: the person may want fewer creators, and asking
   * costs one turn instead of a shortlist nobody can book.
   */
  const budgetTooLow = (captured: Slots): string | null => {
    if (cheapestRate === null) return null;
    if (captured.budgetBdt === null || captured.creatorCount === null) return null;
    const per = captured.budgetBdt / captured.creatorCount;
    if (per >= cheapestRate) return null;
    return `That is about ${formatBdt(Math.round(per))} per creator. Our lowest rate on file is ${formatBdt(cheapestRate)} — fewer creators, or a higher budget?`;
  };

  const run = (captured: Slots, notes: string[]) => {
    const brief: Brief = {
      brandDescription: captured.brandDescription ?? "",
      objective: captured.objective ?? "Brand awareness",
      budgetBdt: captured.budgetBdt ?? 0,
      creatorCount: captured.creatorCount ?? 5,
      platforms: [],
      audienceNotes: notes.join(" "),
    };

    setBuilding(true);
    startTransition(async () => {
      // Two server round trips behind four labels, so the sequence advances on
      // a timer and holds at the last one rather than claiming a precision the
      // pipeline does not report back.
      const tick = setInterval(() => setStage((current) => Math.min(3, current + 1)), 1200);
      try {
        const outcome = await generatePlan(brief);
        if (outcome.ok) {
          setResult({ plan: outcome.plan, brief: outcome.brief });
          setPhase("plan");
          window.scrollTo({ top: 0, behavior: "auto" });
        } else {
          setNotice(outcome.error);
        }
      } catch {
        setNotice("The shortlist could not be built. Try again in a moment.");
      } finally {
        clearInterval(tick);
        setStage(0);
        setBuilding(false);
      }
    });
  };

  const advance = (nextThread: Turn[], questionsAsked: number) => {
    setNotice(null);
    startTransition(async () => {
      let outcome;
      try {
        outcome = await gatherAction(nextThread, questionsAsked);
      } catch {
        // A thrown action used to leave the thread with no question, no error
        // and no way forward but Start over. Whatever happens, say something.
        setNotice("Something went wrong reading that. Try rephrasing it.");
        return;
      }

      if ("message" in outcome) {
        setNotice(outcome.message);
        return;
      }
      setSlots(outcome.captured);

      if (outcome.status === "unusable") {
        setQuestion("Tell me what your company sells and what this campaign is for.");
        setQuickReplies([]);
        return;
      }

      if (outcome.status === "need_info") {
        const tooLow = budgetTooLow(outcome.captured);
        if (tooLow) setNotice(tooLow);
        setQuestion(outcome.question);
        setQuickReplies(outcome.quickReplies);
        setAsked(questionsAsked + 1);
        setThread([...nextThread, { role: "assistant", text: outcome.question }]);
        return;
      }

      const tooLow = budgetTooLow(outcome.captured);
      if (tooLow) {
        setNotice(tooLow);
        setQuestion("How would you like to adjust it?");
        setQuickReplies(["Fewer creators", "Higher budget"]);
        setAsked(questionsAsked + 1);
        return;
      }

      setQuestion(null);
      setQuickReplies([]);
      setAssumptions(outcome.assumptions);
      run(outcome.captured, outcome.assumptions);
    });
  };

  // Results are a working document. They sit on the ordinary canvas with no
  // atmosphere behind them: once someone is reading data, the page stops
  // performing.
  if (phase === "plan" && result) {
    return (
      <div className="mx-auto max-w-[80rem] space-y-8 px-4 py-10 sm:px-6">
        {assumptions.length > 0 ? (
          <ul className="space-y-1 text-sm text-ink-muted">
            {assumptions.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
        <PlanView
          plan={result.plan}
          brief={result.brief}
          rosterEngagement={rosterEngagement}
          regenerating={pending}
          onRegenerate={() => run(slots, assumptions)}
          onStartOver={reset}
        />
      </div>
    );
  }

  return (
    /*
      Fills everything below the nav, so the dark band ends at the fold rather
      than partway down with the page's own canvas showing beneath it.
    */
    <section className="relative isolate -mt-14 flex min-h-dvh flex-col overflow-hidden bg-[#060505] pt-14">
      <HeroLights working={building} />

      {/* Nudged above true centre: an optically centred composition sits a
          little high, and it leaves less dead space under the card. */}
      <div className="relative mx-auto flex w-full max-w-[64rem] flex-1 flex-col justify-center px-4 pb-24 pt-10 sm:px-6">
        {phase === "gathering" ? (
          <div className="w-full">
            <ThreadView
              thread={thread}
              slots={slots}
              question={question}
              quickReplies={quickReplies}
              pending={pending}
              notice={notice}
              onStartOver={reset}
              onAnswer={(text) => {
                const next: Turn[] = [...thread, { role: "user", text }];
                setThread(next);
                advance(next, Math.min(asked, MAX_QUESTIONS));
              }}
            />
          </div>
        ) : (
          <>
            <PromptCard
              value={draft}
              onChange={setDraft}
              pending={pending}
              rosterSize={rosterSize}
              onSubmit={() => {
                const next: Turn[] = [{ role: "user", text: draft.trim() }];
                setThread(next);
                setPhase("gathering");
                advance(next, 0);
              }}
            />
            {notice ? (
              <p className="mx-auto mt-6 max-w-[46rem] text-center text-sm text-white/80">
                {notice}
              </p>
            ) : null}
          </>
        )}

        {building ? <StageLabels stage={stage} rosterSize={rosterSize} /> : null}
      </div>
    </section>
  );
}
