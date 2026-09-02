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
  /** Null when no rate card is on file, which is most of the roster today. */
  ratePerPost: number | null;
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
  /**
   * Background the model supplied from its own training, not from our tables.
   * Rendered separately and labelled as such, because it is unverified.
   */
  context: string;
  role: SelectionRole;
};

export type PlanTotals = {
  spend: number;
  budget: number;
  /** How many of the picks actually have a price, so spend can be read fairly. */
  pricedCount: number;
  unpricedCount: number;
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

/* -------------------------------------------------------------------------- */
/* Step 0: the conversational brief                                            */
/* -------------------------------------------------------------------------- */

/** The four things worth interrupting someone for. Everything else is inferred. */
export type Slots = {
  brandDescription: string | null;
  objective: string | null;
  budgetBdt: number | null;
  creatorCount: number | null;
};

export const EMPTY_SLOTS: Slots = {
  brandDescription: null,
  objective: null,
  budgetBdt: null,
  creatorCount: null,
};

export type Turn = { role: "user" | "assistant"; text: string };

export const MAX_QUESTIONS = 3;

export type GatherResult =
  | {
      status: "need_info";
      captured: Slots;
      question: string;
      quickReplies: string[];
      assumptions: string[];
    }
  | { status: "ready"; captured: Slots; assumptions: string[] }
  | { status: "unusable"; captured: Slots };
