"use client";

import { useState, useTransition } from "react";
import { PromptCard } from "./prompt-card";
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
  };

  /**
   * A budget that cannot buy anyone is caught before the pipeline runs. It is
   * a question, not an error: the person may want fewer creators, and saying
   * so costs one turn instead of a shortlist nobody can book.
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

    startTransition(async () => {
      const tick = setInterval(() => setStage((current) => Math.min(2, current + 1)), 1200);
      try {
        const outcome = await generatePlan(brief);
        if (outcome.ok) {
          setResult({ plan: outcome.plan, brief: outcome.brief });
          setPhase("plan");
          window.scrollTo({ top: 0, behavior: "auto" });
        } else {
          setNotice(outcome.error);
        }
      } finally {
        clearInterval(tick);
        setStage(0);
      }
    });
  };

  const advance = (nextThread: Turn[], questionsAsked: number) => {
    setNotice(null);
    startTransition(async () => {
      const outcome = await gatherAction(nextThread, questionsAsked);

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
        if (tooLow) {
          setNotice(tooLow);
        }
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

  if (phase === "plan" && result) {
    return (
      <div className="space-y-8">
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

  if (phase === "gathering") {
    return (
      <ThreadView
        thread={thread}
        slots={slots}
        question={question}
        quickReplies={quickReplies}
        pending={pending}
        stage={stage}
        notice={notice}
        onStartOver={reset}
        onAnswer={(text) => {
          const next: Turn[] = [...thread, { role: "user", text }];
          setThread(next);
          advance(next, Math.min(asked, MAX_QUESTIONS));
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
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
        <p className="mx-auto max-w-[46rem] text-sm text-warn">{notice}</p>
      ) : null}
    </div>
  );
}
