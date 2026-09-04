"use server";

import { cookies, headers } from "next/headers";
import { publicDirectory, type PublicCreator } from "@/lib/public/directory";
import { isUsableBrief } from "@/lib/strategiser/copy";

/**
 * The public strategiser: one shortlist per visitor, then a wall.
 *
 * Two limits, because either alone is weak. A cookie marks the visitor as
 * having had their run — trivially cleared, but it is what makes the wall
 * appear for an honest person. An in-memory count per address is the backstop
 * against somebody clearing it in a loop; it is per server instance and resets
 * on deploy, which is imperfect but enough friction for a demo.
 *
 * Nothing here is billed to a model. The public roster has no engagement
 * rates, no scores and no prices — only names, photos and follower counts — so
 * there is nothing for a language model to reason over that would not be
 * invention. The shortlist is picked in code from what is actually on file,
 * and the page says so rather than implying a judgement it did not make.
 */
const RUN_COOKIE = "grid_public_run";
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_ADDRESS = 3;
const runs = new Map<string, { count: number; resetAt: number }>();

function overAddressLimit(address: string): boolean {
  const now = Date.now();
  const record = runs.get(address);
  if (!record || now > record.resetAt) {
    runs.set(address, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  record.count += 1;
  return record.count > MAX_PER_ADDRESS;
}

export type PublicPlan = {
  ok: true;
  brief: string;
  picks: PublicCreator[];
  totalReach: number | null;
  note: string;
};

export type PublicPlanResult = PublicPlan | { ok: false; error: string; used: boolean };

/** Words a brief might use for a category, mapped to the roster's own slugs. */
function guessCategories(brief: string, available: string[]): string[] {
  const text = brief.toLowerCase();
  return available.filter((slug) => text.includes(slug.replace(/-/g, " ")));
}

export async function buildPublicShortlist(brief: string): Promise<PublicPlanResult> {
  const trimmed = brief.trim().slice(0, 2000);
  if (!isUsableBrief(trimmed)) {
    return {
      ok: false,
      used: false,
      error: "Tell us a little more — what you sell, and what the campaign is for.",
    };
  }

  const jar = await cookies();
  if (jar.get(RUN_COOKIE)) {
    return {
      ok: false,
      used: true,
      error: "You have had your run. Request access to build as many as you like.",
    };
  }

  const requestHeaders = await headers();
  const address =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (overAddressLimit(address)) {
    return {
      ok: false,
      used: true,
      error: "That is enough for now. Request access to keep going.",
    };
  }

  const roster = await publicDirectory();
  const slugs = [
    ...new Set(roster.map((c) => c.categorySlug).filter((s): s is string => Boolean(s))),
  ];
  const wanted = guessCategories(trimmed, slugs);

  const pool = wanted.length
    ? roster.filter((c) => c.categorySlug && wanted.includes(c.categorySlug))
    : roster;

  const picks = [...pool]
    .sort((a, b) => (b.totalReach ?? -1) - (a.totalReach ?? -1))
    .slice(0, 6);

  const totalReach = picks.reduce<number | null>((sum, c) => {
    if (c.totalReach === null) return sum;
    return (sum ?? 0) + c.totalReach;
  }, null);

  jar.set(RUN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return {
    ok: true,
    brief: trimmed,
    picks,
    totalReach,
    note: wanted.length
      ? `Matched on ${wanted.join(", ")} and ranked by reach.`
      : "No category was clear from the brief, so this is ranked by reach across the whole roster.",
  };
}
