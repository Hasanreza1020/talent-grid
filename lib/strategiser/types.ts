import type { Platform, Tier } from "@/lib/types";

export const OBJECTIVES = [
  "Brand awareness",
  "Product launch",
  "Sales and conversions",
  "App installs",
  "Event promotion",
  "Something else",
] as const;
export type Objective = (typeof OBJECTIVES)[number];

export const MAX_CREATORS = 20;
export const POOL_CAP = 60;
export const STALE_DAYS = 90;

export type Brief = {
  brandDescription: string;
  objective: string;
  budgetBdt: number;
  creatorCount: number;
  platforms: Platform[];
  audienceNotes: string;
};

export type ParsedBrief = {
  categories: string[];
  platforms: Platform[];
  tierMix: {
    reasoning: string;
    nano: number;
    micro: number;
    macro: number;
    mega: number;
  };
  cities: string[];
  audienceSummary: string;
};

/** Exactly the fields the model is allowed to see. No contacts, no notes. */
export type Candidate = {
  id: string;
  slug: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  category: string | null;
  categorySlug: string | null;
  tier: Tier | null;
  city: string | null;
  platforms: { platform: Platform; followers: number | null }[];
  totalReach: number | null;
  engagementRate: number | null;
  ratePerPost: number;
  agencyScore: number | null;
  /** Newest snapshot date. Used to flag a stale figure, never to hide one. */
  capturedOn: string | null;
  stale: boolean;
};

export type SelectionRole = "anchor" | "volume" | "niche" | "experimental";

export type Pick = {
  candidate: Candidate;
  /** The model's one line. Empty when the plain ranking produced this. */
  reason: string;
  role: SelectionRole;
};

export type PlanTotals = {
  spend: number;
  budget: number;
  /** Positive means money left, negative means over. */
  remaining: number;
  combinedReach: number | null;
  costPerThousandReach: number | null;
  averageEngagement: number | null;
  rosterMedianEngagement: number | null;
};

export type Plan = {
  strategySummary: string;
  tradeoffNote: string;
  picks: Pick[];
  totals: PlanTotals;
  /** The rest of the pool, for swapping. Ordered by the same blend. */
  bench: Candidate[];
  /** Filters that had to be relaxed to fill the pool, in the order relaxed. */
  widened: string[];
  /** True when the model was unavailable and this is a plain ranking. */
  degraded: boolean;
};
