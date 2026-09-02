import { describe, expect, it } from "vitest";
import { comparisonSentence, costPerThousandReach } from "@/lib/compare-page/summary";
import type { CompareSubject } from "@/lib/compare-page/subjects";

function subject(overrides: Partial<CompareSubject> = {}): CompareSubject {
  return {
    id: overrides.name ?? "id",
    slug: "slug",
    name: "Someone Anonymous",
    handle: null,
    avatarUrl: null,
    category: null,
    categorySlug: null,
    tier: null,
    city: null,
    platforms: [],
    totalFollowers: null,
    engagementRate: null,
    engagementBasis: "",
    ratePerPost: null,
    agencyScore: null,
    costPerEngagement: null,
    ...overrides,
  };
}

describe("costPerThousandReach", () => {
  it("divides the rate by reach in thousands", () => {
    expect(costPerThousandReach(subject({ ratePerPost: 50_000, totalFollowers: 1_000_000 }))).toBe(50);
  });

  it("is null without a rate", () => {
    expect(costPerThousandReach(subject({ totalFollowers: 1_000_000 }))).toBeNull();
  });

  it("is null without reach, and never divides by zero", () => {
    expect(costPerThousandReach(subject({ ratePerPost: 50_000 }))).toBeNull();
    expect(
      costPerThousandReach(subject({ ratePerPost: 50_000, totalFollowers: 0 })),
    ).toBeNull();
  });
});

describe("comparisonSentence", () => {
  it("needs at least two creators", () => {
    expect(comparisonSentence([subject({ totalFollowers: 100 })])).toBeNull();
  });

  it("states who reaches further", () => {
    const sentence = comparisonSentence([
      subject({ name: "Nusrat Jahan", totalFollowers: 2_300_000 }),
      subject({ name: "Tanvir Ahmed", totalFollowers: 1_000_000 }),
    ]);
    expect(sentence).toBe("Nusrat reaches 2.3× more people.");
  });

  it("stays silent when the reach difference is not worth a sentence", () => {
    expect(
      comparisonSentence([
        subject({ name: "A", totalFollowers: 1_000_000 }),
        subject({ name: "B", totalFollowers: 980_000 }),
      ]),
    ).toBeNull();
  });

  it("makes no reach claim unless every creator has a figure on file", () => {
    const sentence = comparisonSentence([
      subject({ name: "Nusrat Jahan", totalFollowers: 2_300_000 }),
      subject({ name: "Tanvir Ahmed", totalFollowers: null }),
    ]);
    expect(sentence).toBeNull();
  });

  it("adds the cost clause when every rate is on file", () => {
    const sentence = comparisonSentence([
      subject({ name: "Nusrat Jahan", totalFollowers: 2_300_000, ratePerPost: 100_000 }),
      subject({ name: "Tanvir Ahmed", totalFollowers: 1_000_000, ratePerPost: 25_000 }),
    ]);
    // Nusrat: 43.48 per thousand. Tanvir: 25. (43.48 - 25) / 43.48 = 42.5%.
    expect(sentence).toBe(
      "Nusrat reaches 2.3× more people; Tanvir costs 43% less per thousand reach.",
    );
  });

  it("drops the cost clause when one rate is missing", () => {
    const sentence = comparisonSentence([
      subject({ name: "Nusrat Jahan", totalFollowers: 2_300_000, ratePerPost: 100_000 }),
      subject({ name: "Tanvir Ahmed", totalFollowers: 1_000_000, ratePerPost: null }),
    ]);
    expect(sentence).toBe("Nusrat reaches 2.3× more people.");
  });

  it("is null when nothing can be said", () => {
    expect(comparisonSentence([subject({ name: "A" }), subject({ name: "B" })])).toBeNull();
  });
});
