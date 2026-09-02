import type { DirectoryRow } from "@/lib/db/creators";

export type CategoryCard = {
  id: string;
  name: string;
  slug: string;
  creatorCount: number;
  /** Summed audience across the category. Null when nothing is on file. */
  reach: number | null;
  /**
   * Portraits for the collage, biggest account first. Capped at 16 and never
   * padded: a short list draws a smaller grid rather than a repeated face.
   */
  portraits: string[];
};

/** 16, 9 or 4 tiles — the largest square that the available portraits fill. */
export function collageSize(count: number): 16 | 9 | 4 | 0 {
  if (count >= 16) return 16;
  if (count >= 9) return 9;
  if (count >= 4) return 4;
  return 0;
}

/**
 * One card per top-level category that has anyone in it.
 *
 * A creator counts towards a category if they are filed under it or under one
 * of its children, which is the rule the rest of the product already uses.
 * Ordered by reach rather than headcount: the question the card answers is how
 * much audience sits behind a category, and a hundred nano creators is not the
 * same answer as four mega ones.
 */
export function buildCategoryCards(
  rows: DirectoryRow[],
  categories: { id: string; name: string; slug: string }[],
): CategoryCard[] {
  const active = rows.filter((row) => row.status === "active" && row.deletedAt === null);

  return categories
    .map((category) => {
      const members = active.filter((row) =>
        row.categories.some(
          (ref) => ref.id === category.id || ref.parentId === category.id,
        ),
      );

      const reach = members.reduce<number | null>((sum, row) => {
        if (row.totalReach === null) return sum;
        return (sum ?? 0) + row.totalReach;
      }, null);

      const portraits = [...members]
        .sort((a, b) => (b.totalReach ?? -1) - (a.totalReach ?? -1))
        .map((row) => row.portraitUrl)
        .filter((url): url is string => url !== null)
        .slice(0, 16);

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        creatorCount: members.length,
        reach,
        portraits,
      };
    })
    // An empty category is hidden rather than drawn as an empty card.
    .filter((card) => card.creatorCount > 0)
    .sort((a, b) => (b.reach ?? -1) - (a.reach ?? -1));
}
