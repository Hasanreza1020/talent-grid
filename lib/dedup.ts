/**
 * Duplicate detection for spreadsheet imports.
 *
 * The same creator appears more than once in the source files, sometimes under
 * a differently punctuated name and sometimes with a different subset of their
 * platforms filled in. Two independent signals are used: the normalised
 * display name, and the handles extracted from their profile URLs.
 *
 * Nothing here merges anything. It produces grouped candidates with a written
 * reason for each link, which the importer records in its report so a human
 * can review every decision.
 */

import type { Platform } from "./types";

export type DedupCandidate = {
  /** 1-based row number in the source file, used in the report. */
  rowNumber: number;
  displayName: string;
  handles: { platform: Platform; handle: string }[];
};

export type MatchKind = "exact_name" | "fuzzy_name" | "shared_handle";

export type MatchLink = {
  kind: MatchKind;
  rows: [number, number];
  similarity?: number;
  reasoning: string;
};

export type DedupGroup = {
  rowNumbers: number[];
  links: MatchLink[];
};

export const FUZZY_NAME_THRESHOLD = 0.85;

/** Lowercase alphanumeric only, matching public.tg_normalise_name in SQL. */
export function normaliseName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function normaliseHandle(handle: string): string {
  return handle.replace(/^@/, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    previous = current;
  }
  return previous[b.length];
}

/** 0 to 1, where 1 is identical after normalisation. */
export function nameSimilarity(a: string, b: string): number {
  const left = normaliseName(a);
  const right = normaliseName(b);
  if (left === "" && right === "") return 1;
  if (left === "" || right === "") return 0;
  const distance = levenshtein(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

class UnionFind {
  private parent = new Map<number, number>();

  find(x: number): number {
    if (!this.parent.has(x)) this.parent.set(x, x);
    let root = x;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    let cursor = x;
    while (this.parent.get(cursor) !== root) {
      const next = this.parent.get(cursor)!;
      this.parent.set(cursor, root);
      cursor = next;
    }
    return root;
  }

  union(a: number, b: number): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }
}

export function findDuplicateGroups(
  candidates: DedupCandidate[],
  threshold: number = FUZZY_NAME_THRESHOLD,
): DedupGroup[] {
  const links: MatchLink[] = [];
  const union = new UnionFind();
  for (const candidate of candidates) union.find(candidate.rowNumber);

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const a = candidates[i];
      const b = candidates[j];
      const pair: [number, number] = [a.rowNumber, b.rowNumber];

      const normalisedA = normaliseName(a.displayName);
      const normalisedB = normaliseName(b.displayName);

      if (normalisedA !== "" && normalisedA === normalisedB) {
        links.push({
          kind: "exact_name",
          rows: pair,
          similarity: 1,
          reasoning:
            `Names normalise to the same string "${normalisedA}" ` +
            `(${JSON.stringify(a.displayName)} and ${JSON.stringify(b.displayName)}).`,
        });
        union.union(a.rowNumber, b.rowNumber);
        continue;
      }

      const sharedHandles = a.handles.filter((handleA) =>
        b.handles.some(
          (handleB) => normaliseHandle(handleA.handle) === normaliseHandle(handleB.handle),
        ),
      );

      if (sharedHandles.length > 0) {
        links.push({
          kind: "shared_handle",
          rows: pair,
          reasoning:
            `Both rows resolve to the handle "${sharedHandles[0].handle}" ` +
            `(${sharedHandles.map((h) => h.platform).join(", ")}).`,
        });
        union.union(a.rowNumber, b.rowNumber);
        continue;
      }

      const similarity = nameSimilarity(a.displayName, b.displayName);
      if (similarity >= threshold) {
        links.push({
          kind: "fuzzy_name",
          rows: pair,
          similarity,
          reasoning:
            `Names are ${(similarity * 100).toFixed(1)}% similar after ` +
            `normalisation (${JSON.stringify(a.displayName)} and ` +
            `${JSON.stringify(b.displayName)}), above the ` +
            `${(threshold * 100).toFixed(0)}% threshold.`,
        });
        union.union(a.rowNumber, b.rowNumber);
      }
    }
  }

  const grouped = new Map<number, number[]>();
  for (const candidate of candidates) {
    const root = union.find(candidate.rowNumber);
    const bucket = grouped.get(root) ?? [];
    bucket.push(candidate.rowNumber);
    grouped.set(root, bucket);
  }

  return [...grouped.values()]
    .filter((rowNumbers) => rowNumbers.length > 1)
    .map((rowNumbers) => ({
      rowNumbers: rowNumbers.sort((a, b) => a - b),
      links: links.filter(
        (link) => rowNumbers.includes(link.rows[0]) && rowNumbers.includes(link.rows[1]),
      ),
    }))
    .sort((a, b) => a.rowNumbers[0] - b.rowNumbers[0]);
}
