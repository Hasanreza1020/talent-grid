import { describe, expect, it } from "vitest";
import { buildCategoryCards, collageSize } from "@/lib/home/categories";
import type { DirectoryRow } from "@/lib/db/creators";

const TRAVEL = { id: "cat-travel", name: "Travel", slug: "travel" };
const FOOD = { id: "cat-food", name: "Food", slug: "food" };

function row(overrides: Partial<DirectoryRow> & { id: string }): DirectoryRow {
  return {
    status: "active",
    deletedAt: null,
    totalReach: null,
    portraitUrl: null,
    categories: [],
    ...overrides,
  } as unknown as DirectoryRow;
}

function inCategory(categoryId: string, parentId: string | null = null) {
  return [{ id: categoryId, name: "", slug: "", parentId, isPrimary: true }];
}

describe("collageSize", () => {
  it("picks the largest square the portraits fill", () => {
    expect(collageSize(20)).toBe(16);
    expect(collageSize(16)).toBe(16);
    expect(collageSize(15)).toBe(9);
    expect(collageSize(9)).toBe(9);
    expect(collageSize(8)).toBe(4);
    expect(collageSize(4)).toBe(4);
  });

  it("draws nothing below four", () => {
    expect(collageSize(3)).toBe(0);
    expect(collageSize(0)).toBe(0);
  });
});

describe("buildCategoryCards", () => {
  it("counts creators filed under a child category too", () => {
    const cards = buildCategoryCards(
      [
        row({ id: "a", categories: inCategory("cat-travel"), totalReach: 100 }),
        row({ id: "b", categories: inCategory("child", "cat-travel"), totalReach: 50 }),
      ],
      [TRAVEL],
    );
    expect(cards[0].creatorCount).toBe(2);
    expect(cards[0].reach).toBe(150);
  });

  it("hides a category with nobody in it", () => {
    const cards = buildCategoryCards(
      [row({ id: "a", categories: inCategory("cat-travel"), totalReach: 10 })],
      [TRAVEL, FOOD],
    );
    expect(cards.map((card) => card.slug)).toEqual(["travel"]);
  });

  it("orders by reach, not headcount", () => {
    const cards = buildCategoryCards(
      [
        row({ id: "a", categories: inCategory("cat-travel"), totalReach: 10 }),
        row({ id: "b", categories: inCategory("cat-travel"), totalReach: 10 }),
        row({ id: "c", categories: inCategory("cat-food"), totalReach: 900 }),
      ],
      [TRAVEL, FOOD],
    );
    expect(cards.map((card) => card.slug)).toEqual(["food", "travel"]);
  });

  it("leaves reach null when nothing is on file rather than reporting zero", () => {
    const cards = buildCategoryCards(
      [row({ id: "a", categories: inCategory("cat-travel") })],
      [TRAVEL],
    );
    expect(cards[0].reach).toBeNull();
  });

  it("takes portraits biggest first, skips creators without one, and caps at 16", () => {
    // 30 creators, every third without a portrait: 20 usable, so the cap bites.
    const rows = Array.from({ length: 30 }, (_, index) =>
      row({
        id: `c${index}`,
        categories: inCategory("cat-travel"),
        totalReach: index,
        portraitUrl: index % 3 === 0 ? null : `p${index}.webp`,
      }),
    );
    const cards = buildCategoryCards(rows, [TRAVEL]);
    expect(cards[0].creatorCount).toBe(30);
    expect(cards[0].portraits).toHaveLength(16);
    // Biggest reach first, and index 27 is skipped for having no portrait.
    expect(cards[0].portraits[0]).toBe("p29.webp");
    expect(cards[0].portraits).not.toContain("p27.webp");
    expect(new Set(cards[0].portraits).size).toBe(16);
  });

  it("ignores archived and inactive creators", () => {
    const cards = buildCategoryCards(
      [
        row({ id: "a", categories: inCategory("cat-travel"), totalReach: 10 }),
        row({ id: "b", categories: inCategory("cat-travel"), deletedAt: "2026-01-01" }),
        row({ id: "c", categories: inCategory("cat-travel"), status: "inactive" }),
      ],
      [TRAVEL],
    );
    expect(cards[0].creatorCount).toBe(1);
  });
});
