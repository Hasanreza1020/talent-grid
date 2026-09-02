"use client";

import { useState, useTransition } from "react";
import { BriefForm } from "./brief-form";
import { PlanView } from "./plan-view";
import { generatePlan } from "@/app/(app)/strategiser/actions";
import type { Brief, Plan } from "@/lib/strategiser/types";

export function Strategiser({
  cheapestRate,
  rosterSize,
  rosterEngagement,
}: {
  cheapestRate: number | null;
  rosterSize: number;
  rosterEngagement: number[];
}) {
  const [plan, setPlan] = useState<{ plan: Plan; brief: Brief } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [pending, startTransition] = useTransition();

  const run = (brief: Brief, keepScroll = false) => {
    setError(null);
    setStage(0);
    startTransition(async () => {
      // The stages below are a coarse read on a single server round trip. They
      // advance on a timer rather than on real signals, so they are kept
      // factual and few: claiming finer progress than we have would be a
      // decoration pretending to be information.
      const tick = setInterval(() => setStage((current) => Math.min(2, current + 1)), 1200);
      try {
        const result = await generatePlan(brief);
        if (result.ok) {
          setPlan({ plan: result.plan, brief: result.brief });
          if (!keepScroll) window.scrollTo({ top: 0, behavior: "auto" });
        } else {
          setError(result.error);
        }
      } finally {
        clearInterval(tick);
        setStage(0);
      }
    });
  };

  if (plan) {
    return (
      <PlanView
        plan={plan.plan}
        brief={plan.brief}
        rosterEngagement={rosterEngagement}
        regenerating={pending}
        onRegenerate={() => run(plan.brief, true)}
        onStartOver={() => {
          setPlan(null);
          setError(null);
        }}
      />
    );
  }

  return (
    <BriefForm
      cheapestRate={cheapestRate}
      rosterSize={rosterSize}
      pending={pending}
      stage={stage}
      error={error}
      onSubmit={run}
    />
  );
}
