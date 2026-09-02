import type { CompareSubject } from "./subjects";

/** Reach per 1,000, in BDT. Null unless both halves are on file and non-zero. */
export function costPerThousandReach(creator: CompareSubject): number | null {
  if (creator.ratePerPost === null) return null;
  if (creator.totalFollowers === null || creator.totalFollowers <= 0) return null;
  return creator.ratePerPost / (creator.totalFollowers / 1000);
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/**
 * One sentence of plain comparison, or null when the data cannot support one.
 *
 * Deliberately narrow. It makes at most two claims — who reaches further, and
 * who costs less per thousand reached — and only makes a claim when every
 * creator involved has the figure on file. A sentence that quietly compares
 * two of four creators reads as a statement about all four, which is the way
 * a summary line misleads.
 */
export function comparisonSentence(creators: CompareSubject[]): string | null {
  if (creators.length < 2) return null;

  const clauses: string[] = [];

  const reaches = creators.filter((creator) => creator.totalFollowers !== null);
  if (reaches.length === creators.length) {
    const sorted = [...reaches].sort(
      (a, b) => (b.totalFollowers ?? 0) - (a.totalFollowers ?? 0),
    );
    const top = sorted[0];
    const next = sorted[sorted.length - 1];
    const ratio = (top.totalFollowers ?? 0) / (next.totalFollowers ?? 1);
    // Below about 1.1x the difference is not worth a sentence.
    if (Number.isFinite(ratio) && ratio >= 1.1) {
      clauses.push(
        `${firstName(top.name)} reaches ${ratio.toFixed(1)}× more people`,
      );
    }
  }

  const costs = creators
    .map((creator) => ({ creator, cost: costPerThousandReach(creator) }))
    .filter((entry): entry is { creator: CompareSubject; cost: number } => entry.cost !== null);

  if (costs.length === creators.length && costs.length >= 2) {
    const sorted = [...costs].sort((a, b) => a.cost - b.cost);
    const cheapest = sorted[0];
    const dearest = sorted[sorted.length - 1];
    if (dearest.cost > 0 && cheapest.cost < dearest.cost) {
      const saving = Math.round(((dearest.cost - cheapest.cost) / dearest.cost) * 100);
      if (saving >= 1) {
        clauses.push(
          `${firstName(cheapest.creator.name)} costs ${saving}% less per thousand reach`,
        );
      }
    }
  }

  if (clauses.length === 0) return null;
  return `${clauses.join("; ")}.`;
}
