"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/db/user";
import { buildPlan, parseBrief } from "@/lib/strategiser/pipeline";
import {
  gatherBrief,
  MAX_QUESTIONS,
  type GatherResult,
  type Turn,
} from "@/lib/strategiser/gather";
import { PLATFORMS, type Platform } from "@/lib/types";
import { MAX_CREATORS, type Brief, type ParsedBrief, type Plan } from "@/lib/strategiser/types";

const DAILY_LIMIT = 20;

/**
 * The parsed brief, cached on a hash of the input.
 *
 * Held in module scope, which on a serverless runtime means per warm instance.
 * That is enough for what it is for — a user nudging the creator count should
 * not pay for a second parse — and losing it costs one extra call, so it is
 * not worth a table.
 */
const parseCache = new Map<string, ParsedBrief>();

function briefKey(brief: Brief): string {
  // The creator count deliberately does not key the cache: it does not change
  // which categories or platforms the brief implies.
  return JSON.stringify([
    brief.brandDescription.trim(),
    brief.objective,
    brief.platforms,
    brief.audienceNotes.trim(),
  ]);
}

function sanitise(input: Brief): Brief {
  return {
    brandDescription: String(input.brandDescription ?? "").slice(0, 600),
    objective: String(input.objective ?? "").slice(0, 120),
    budgetBdt: Math.max(0, Math.round(Number(input.budgetBdt) || 0)),
    creatorCount: Math.min(
      MAX_CREATORS,
      Math.max(1, Math.round(Number(input.creatorCount) || 1)),
    ),
    platforms: (Array.isArray(input.platforms) ? input.platforms : []).filter(
      (entry): entry is Platform => (PLATFORMS as readonly string[]).includes(entry),
    ),
    audienceNotes: String(input.audienceNotes ?? "").slice(0, 300),
  };
}

/**
 * Runs used today, counted server-side.
 *
 * Returns null when the table is not there yet, which the caller reads as
 * "unlimited". The migration that creates it has to be applied against the
 * project separately, and the strategiser working without a cap is a better
 * failure than the strategiser not working.
 */
async function runsToday(userId: string): Promise<number | null> {
  const supabase = await createClient();
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("strategiser_runs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());

  if (error) return null;
  return count ?? 0;
}

export type PlanResult =
  | { ok: true; plan: Plan; brief: Brief }
  | { ok: false; error: string };

/**
 * Step 0, exposed to the client.
 *
 * The thread is re-sent whole each turn rather than held on the server: it is
 * a handful of short strings, and a conversation that survives a refresh is
 * worth more than the bytes saved.
 */
export async function gatherAction(
  thread: Turn[],
  asked: number,
): Promise<GatherResult | { status: "error"; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { status: "error", message: "Your session has expired. Sign in again." };

  const trimmed = thread
    .filter((turn) => typeof turn?.text === "string" && turn.text.trim())
    .slice(-12)
    .map((turn) => ({
      role: turn.role === "assistant" ? ("assistant" as const) : ("user" as const),
      text: turn.text.trim().slice(0, 1200),
    }));

  if (trimmed.length === 0) {
    return { status: "error", message: "Describe the campaign first." };
  }

  return gatherBrief(trimmed, Math.max(0, Math.min(asked, MAX_QUESTIONS)));
}

export async function generatePlan(input: Brief): Promise<PlanResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in and try again." };

  const brief = sanitise(input);
  if (!brief.brandDescription.trim()) {
    return { ok: false, error: "Describe what your company does first." };
  }
  if (brief.budgetBdt <= 0) return { ok: false, error: "Enter a budget above zero." };

  const used = await runsToday(user.id);
  if (used !== null && used >= DAILY_LIMIT) {
    return {
      ok: false,
      error: `You have used all ${DAILY_LIMIT} strategiser runs for today. The count resets at midnight.`,
    };
  }

  const key = briefKey(brief);
  let parsed = parseCache.get(key);
  if (!parsed) {
    parsed = await parseBrief(brief);
    parseCache.set(key, parsed);
  }

  const plan = await buildPlan(brief, parsed);

  // Logging is best effort. A missing table must not cost the user their plan.
  try {
    const supabase = await createClient();
    await supabase.from("strategiser_runs").insert({
      user_id: user.id,
      brief,
      parsed_brief: parsed,
      pool_ids: [...plan.picks.map((p) => p.candidate.id), ...plan.bench.map((c) => c.id)],
      selected_ids: plan.picks.map((pick) => pick.candidate.id),
      strategy_summary: plan.strategySummary || null,
      tradeoff_note: plan.tradeoffNote || null,
      degraded: plan.degraded,
    });
  } catch {
    // Nothing to do here; the run already happened.
  }

  return { ok: true, plan, brief };
}

/** Step 3 again over the same pool. Cheap, and a different mix each time. */
export async function regeneratePlan(input: Brief): Promise<PlanResult> {
  return generatePlan(input);
}
