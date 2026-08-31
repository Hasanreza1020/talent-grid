/**
 * Browse filter state.
 *
 * Filter state lives entirely in the URL query string, so any filtered view is
 * a shareable link and pasting one into a new tab restores exactly the same
 * result set. Parsing and serialising are inverses of each other, and the
 * filtering itself is a pure function so it can be tested.
 */

import type { DirectoryRow } from "./db/creators";
import type { CreatorMetrics } from "./metrics/directory";
import {
  CREATOR_STATUSES,
  DATA_CONFIDENCES,
  GENDERS,
  LANGUAGES,
  PLATFORMS,
  TIERS,
  type CreatorStatus,
  type DataConfidence,
  type Gender,
  type Language,
  type Platform,
  type Tier,
} from "./types";

export const SORTS = [
  "relevance",
  "followers",
  "engagement",
  "score",
  "rate",
  "recent",
] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABEL: Record<Sort, string> = {
  relevance: "Relevance",
  followers: "Followers",
  engagement: "Engagement rate",
  score: "Agency score",
  rate: "Cheapest rate",
  recent: "Recently added",
};

export type BrowseFilters = {
  q: string;
  categories: string[];
  platforms: Platform[];
  followersMin: number | null;
  followersMax: number | null;
  engagementMin: number | null;
  tiers: Tier[];
  cities: string[];
  languages: Language[];
  genders: Gender[];
  rateMin: number | null;
  rateMax: number | null;
  acceptsBarter: boolean | null;
  tags: string[];
  hasPortrait: boolean | null;
  dataConfidence: DataConfidence[];
  statuses: CreatorStatus[];
  sort: Sort;
  view: "grid" | "table";
};

export const EMPTY_FILTERS: BrowseFilters = {
  q: "",
  categories: [],
  platforms: [],
  followersMin: null,
  followersMax: null,
  engagementMin: null,
  tiers: [],
  cities: [],
  languages: [],
  genders: [],
  rateMin: null,
  rateMax: null,
  acceptsBarter: null,
  tags: [],
  hasPortrait: null,
  dataConfidence: [],
  statuses: [],
  sort: "relevance",
  view: "grid",
};

type Params = Record<string, string | string[] | undefined>;

function list(params: Params, key: string): string[] {
  const value = params[key];
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw.flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean);
}

function only<T extends string>(values: string[], allowed: readonly T[]): T[] {
  return values.filter((value): value is T => (allowed as readonly string[]).includes(value));
}

function num(params: Params, key: string): number | null {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === "") return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function bool(params: Params, key: string): boolean | null {
  const value = params[key];
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

export function parseFilters(params: Params): BrowseFilters {
  const sortRaw = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const viewRaw = Array.isArray(params.view) ? params.view[0] : params.view;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;

  return {
    q: (q ?? "").trim(),
    categories: list(params, "category"),
    platforms: only(list(params, "platform"), PLATFORMS),
    followersMin: num(params, "followersMin"),
    followersMax: num(params, "followersMax"),
    engagementMin: num(params, "engagementMin"),
    tiers: only(list(params, "tier"), TIERS),
    cities: list(params, "city"),
    languages: only(list(params, "language"), LANGUAGES),
    genders: only(list(params, "gender"), GENDERS),
    rateMin: num(params, "rateMin"),
    rateMax: num(params, "rateMax"),
    acceptsBarter: bool(params, "barter"),
    tags: list(params, "tag"),
    hasPortrait: bool(params, "portrait"),
    dataConfidence: only(list(params, "confidence"), DATA_CONFIDENCES),
    statuses: only(list(params, "status"), CREATOR_STATUSES),
    sort: (SORTS as readonly string[]).includes(sortRaw ?? "") ? (sortRaw as Sort) : "relevance",
    view: viewRaw === "table" ? "table" : "grid",
  };
}

export function filtersToQuery(filters: BrowseFilters): string {
  const params = new URLSearchParams();
  const setList = (key: string, values: string[]) => {
    if (values.length) params.set(key, values.join(","));
  };
  const setNum = (key: string, value: number | null) => {
    if (value !== null) params.set(key, String(value));
  };
  const setBool = (key: string, value: boolean | null) => {
    if (value !== null) params.set(key, String(value));
  };

  if (filters.q) params.set("q", filters.q);
  setList("category", filters.categories);
  setList("platform", filters.platforms);
  setNum("followersMin", filters.followersMin);
  setNum("followersMax", filters.followersMax);
  setNum("engagementMin", filters.engagementMin);
  setList("tier", filters.tiers);
  setList("city", filters.cities);
  setList("language", filters.languages);
  setList("gender", filters.genders);
  setNum("rateMin", filters.rateMin);
  setNum("rateMax", filters.rateMax);
  setBool("barter", filters.acceptsBarter);
  setList("tag", filters.tags);
  setBool("portrait", filters.hasPortrait);
  setList("confidence", filters.dataConfidence);
  setList("status", filters.statuses);
  if (filters.sort !== "relevance") params.set("sort", filters.sort);
  if (filters.view !== "grid") params.set("view", filters.view);

  return params.toString();
}

// Individual predicates, named so the empty state can say which one is to blame.

export type FilterKey = keyof Omit<BrowseFilters, "sort" | "view">;

export const FILTER_LABEL: Record<FilterKey, string> = {
  q: "Search",
  categories: "Category",
  platforms: "Platform",
  followersMin: "Minimum followers",
  followersMax: "Maximum followers",
  engagementMin: "Minimum engagement rate",
  tiers: "Tier",
  cities: "City",
  languages: "Language",
  genders: "Gender",
  rateMin: "Minimum rate",
  rateMax: "Maximum rate",
  acceptsBarter: "Accepts barter",
  tags: "Tags",
  hasPortrait: "Has portrait",
  dataConfidence: "Data confidence",
  statuses: "Status",
};

type Context = { metrics: Map<string, CreatorMetrics> };

const PREDICATES: Record<
  FilterKey,
  (row: DirectoryRow, filters: BrowseFilters, context: Context) => boolean
> = {
  q: (row, filters) => {
    if (!filters.q) return true;
    const needle = filters.q.toLowerCase();
    return (
      row.displayName.toLowerCase().includes(needle) ||
      (row.primaryHandle ?? "").toLowerCase().includes(needle) ||
      row.accounts.some((account) => (account.handle ?? "").toLowerCase().includes(needle))
    );
  },
  categories: (row, filters) =>
    filters.categories.length === 0 ||
    row.categories.some((category) => filters.categories.includes(category.slug)),
  platforms: (row, filters) =>
    filters.platforms.length === 0 ||
    row.accounts.some((account) => filters.platforms.includes(account.platform)),
  followersMin: (row, filters) =>
    filters.followersMin === null ||
    (row.primaryFollowers !== null && row.primaryFollowers >= filters.followersMin),
  followersMax: (row, filters) =>
    filters.followersMax === null ||
    (row.primaryFollowers !== null && row.primaryFollowers <= filters.followersMax),
  engagementMin: (row, filters, context) => {
    if (filters.engagementMin === null) return true;
    const value = context.metrics.get(row.id)?.engagement.value;
    return value !== null && value !== undefined && value >= filters.engagementMin;
  },
  tiers: (row, filters) =>
    filters.tiers.length === 0 || (row.tier !== null && filters.tiers.includes(row.tier)),
  cities: (row, filters) =>
    filters.cities.length === 0 || (row.city !== null && filters.cities.includes(row.city)),
  languages: (row, filters) =>
    filters.languages.length === 0 || filters.languages.includes(row.primaryLanguage),
  genders: (row, filters) =>
    filters.genders.length === 0 || filters.genders.includes(row.gender),
  rateMin: (row, filters) =>
    filters.rateMin === null ||
    (row.cheapestRateBdt !== null && row.cheapestRateBdt >= filters.rateMin),
  rateMax: (row, filters) =>
    filters.rateMax === null ||
    (row.cheapestRateBdt !== null && row.cheapestRateBdt <= filters.rateMax),
  acceptsBarter: (row, filters) =>
    filters.acceptsBarter === null || row.acceptsBarter === filters.acceptsBarter,
  tags: (row, filters) =>
    filters.tags.length === 0 || row.tags.some((tag) => filters.tags.includes(tag.slug)),
  hasPortrait: (row, filters) =>
    filters.hasPortrait === null || (row.portraitUrl !== null) === filters.hasPortrait,
  dataConfidence: (row, filters) =>
    filters.dataConfidence.length === 0 || filters.dataConfidence.includes(row.dataConfidence),
  statuses: (row, filters) =>
    filters.statuses.length === 0 || filters.statuses.includes(row.status),
};

export function activeFilterKeys(filters: BrowseFilters): FilterKey[] {
  return (Object.keys(PREDICATES) as FilterKey[]).filter((key) => {
    const value = filters[key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value !== "";
    return value !== null;
  });
}

export function applyFilters(
  rows: DirectoryRow[],
  filters: BrowseFilters,
  context: Context,
  skip: FilterKey[] = [],
): DirectoryRow[] {
  const keys = activeFilterKeys(filters).filter((key) => !skip.includes(key));
  return rows.filter((row) => keys.every((key) => PREDICATES[key](row, filters, context)));
}

/**
 * When a filtered view is empty, work out which single filter is responsible,
 * so the empty state can name it and offer to clear exactly that one.
 * Returns null when no single filter explains it.
 */
export function findBlockingFilter(
  rows: DirectoryRow[],
  filters: BrowseFilters,
  context: Context,
): { key: FilterKey; label: string; wouldMatch: number } | null {
  const active = activeFilterKeys(filters);
  if (active.length === 0) return null;

  const candidates = active
    .map((key) => ({
      key,
      label: FILTER_LABEL[key],
      wouldMatch: applyFilters(rows, filters, context, [key]).length,
    }))
    .filter((candidate) => candidate.wouldMatch > 0)
    .sort((a, b) => b.wouldMatch - a.wouldMatch);

  return candidates[0] ?? null;
}

export function clearFilter(filters: BrowseFilters, key: FilterKey): BrowseFilters {
  const cleared: BrowseFilters = { ...filters };
  const empty = EMPTY_FILTERS[key];
  // Assigning the empty value for this key; the types line up per key but
  // TypeScript cannot see that through a generic index.
  (cleared as Record<string, unknown>)[key] = Array.isArray(empty) ? [] : empty;
  return cleared;
}

export function sortRows(
  rows: DirectoryRow[],
  sort: Sort,
  context: Context,
): DirectoryRow[] {
  const sorted = [...rows];
  // Missing values always sort last, whichever direction the column runs, so a
  // creator with no data never appears to be the cheapest or the best.
  const byNumber = (pick: (row: DirectoryRow) => number | null, descending: boolean) =>
    sorted.sort((a, b) => {
      const left = pick(a);
      const right = pick(b);
      if (left === null && right === null) return a.displayName.localeCompare(b.displayName);
      if (left === null) return 1;
      if (right === null) return -1;
      if (left === right) return a.displayName.localeCompare(b.displayName);
      return descending ? right - left : left - right;
    });

  switch (sort) {
    case "followers":
      return byNumber((row) => row.primaryFollowers, true);
    case "engagement":
      return byNumber((row) => context.metrics.get(row.id)?.engagement.value ?? null, true);
    case "score":
      return byNumber(
        (row) => context.metrics.get(row.id)?.score.value?.score ?? null,
        true,
      );
    case "rate":
      return byNumber((row) => row.cheapestRateBdt, false);
    case "recent":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "relevance":
    default:
      // Without a search term, relevance means the most complete records
      // first: verified before unverified, then by reach.
      return sorted.sort((a, b) => {
        const confidenceRank = { verified: 0, partial: 1, unverified: 2 };
        const byConfidence =
          confidenceRank[a.dataConfidence] - confidenceRank[b.dataConfidence];
        if (byConfidence !== 0) return byConfidence;
        return (b.totalReach ?? -1) - (a.totalReach ?? -1);
      });
  }
}
