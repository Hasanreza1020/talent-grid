import { describe, expect, it } from "vitest";
import {
  findDuplicateGroups,
  nameSimilarity,
  normaliseName,
  normaliseHandle,
} from "@/lib/dedup";

describe("normaliseName", () => {
  it("reduces to lowercase alphanumeric only", () => {
    expect(normaliseName("Jannat The Lunatic Traveler")).toBe("jannatthelunatictraveler");
    expect(normaliseName("jannatthelunatictraveler")).toBe("jannatthelunatictraveler");
    expect(normaliseName("Mr. Mixer's World")).toBe("mrmixersworld");
    expect(normaliseName("Rafi The Little Traveler\r\n")).toBe("rafithelittletraveler");
    expect(normaliseName("Movewith Mamun Official ")).toBe("movewithmamunofficial");
  });
});

describe("normaliseHandle", () => {
  it("strips the @ and punctuation", () => {
    expect(normaliseHandle("@travel.by.shimul")).toBe("travelbyshimul");
    expect(normaliseHandle("vloger_naeem10")).toBe("vlogernaeem10");
  });
});

describe("nameSimilarity", () => {
  it("scores identical normalised names as 1", () => {
    expect(nameSimilarity("Jannat The Lunatic Traveler", "jannatthelunatictraveler")).toBe(1);
  });

  it("scores unrelated names low", () => {
    expect(nameSimilarity("Md Fizz", "Pause a Moment")).toBeLessThan(0.5);
    expect(nameSimilarity("Travel A One", "Bd travellers")).toBeLessThan(0.85);
  });

  it("does not confuse the two distinct Travel-prefixed creators", () => {
    // These are different people and must not be merged.
    expect(nameSimilarity("Travel With Naimur", "Travel With Naim Sheikh")).toBeLessThan(0.85);
    expect(nameSimilarity("Travel A One", "Travel by shimul")).toBeLessThan(0.85);
  });
});

describe("findDuplicateGroups", () => {
  it("groups the two Rafi rows on their identical normalised name", () => {
    const { groups } = findDuplicateGroups([
      {
        rowNumber: 13,
        displayName: "Rafi The Little Traveler\r\n",
        handles: [{ platform: "tiktok", handle: "rafithelittletraveler" }],
      },
      {
        rowNumber: 14,
        displayName: "Rafi The Little Traveler\r\n",
        handles: [{ platform: "tiktok", handle: "rafithelittletraveler" }],
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].rowNumbers).toEqual([13, 14]);
    expect(groups[0].links[0].kind).toBe("exact_name");
  });

  it("groups the two Jannat rows even though they are cased differently", () => {
    const { groups } = findDuplicateGroups([
      {
        rowNumber: 11,
        displayName: "Jannat The Lunatic Traveler",
        handles: [
          { platform: "facebook", handle: "jannatthelunatictravelerpage" },
          { platform: "youtube", handle: "JannatulFerdausJannat" },
        ],
      },
      {
        rowNumber: 24,
        displayName: "jannatthelunatictraveler",
        handles: [{ platform: "tiktok", handle: "jannatthelunatictraveler" }],
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].rowNumbers).toEqual([11, 24]);
    expect(groups[0].links[0].reasoning).toMatch(/normalise to the same string/);
  });

  it("links rows that share a handle even when the names differ", () => {
    const { groups } = findDuplicateGroups([
      {
        rowNumber: 2,
        displayName: "Some Creator",
        handles: [{ platform: "tiktok", handle: "sharedhandle" }],
      },
      {
        rowNumber: 9,
        displayName: "Totally Different Name",
        handles: [{ platform: "tiktok", handle: "shared.handle" }],
      },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].links[0].kind).toBe("shared_handle");
  });

  it("leaves genuinely distinct creators alone", () => {
    const { groups } = findDuplicateGroups([
      { rowNumber: 2, displayName: "Travel With Naimur", handles: [] },
      { rowNumber: 3, displayName: "Travel With Naim Sheikh", handles: [] },
      { rowNumber: 4, displayName: "Travel A One", handles: [] },
      { rowNumber: 5, displayName: "Travel by shimul", handles: [] },
      { rowNumber: 6, displayName: "Bd travellers", handles: [] },
    ]);

    expect(groups).toHaveLength(0);
  });

  it("collapses a chain of three into one group", () => {
    const { groups } = findDuplicateGroups([
      { rowNumber: 1, displayName: "A Creator", handles: [{ platform: "tiktok", handle: "aaa" }] },
      { rowNumber: 2, displayName: "A Creator", handles: [] },
      { rowNumber: 3, displayName: "Unrelated Person", handles: [{ platform: "youtube", handle: "aaa" }] },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].rowNumbers).toEqual([1, 2, 3]);
  });

  it("records a reason for every link so the report can show its working", () => {
    const { groups } = findDuplicateGroups([
      { rowNumber: 1, displayName: "Same Name", handles: [] },
      { rowNumber: 2, displayName: "same name", handles: [] },
    ]);

    for (const link of groups[0].links) {
      expect(link.reasoning.length).toBeGreaterThan(10);
    }
  });
});

describe("same name, different person", () => {
  // Two creators in the Lifestyle sheet are both called Sneha. Merging them on
  // the name alone would fuse two real people into one record.
  const sneha = [
    {
      rowNumber: 130,
      displayName: "Sneha",
      handles: [
        { platform: "instagram" as const, handle: "sne.hahaaa" },
        { platform: "tiktok" as const, handle: "sne.haha0" },
      ],
    },
    {
      rowNumber: 152,
      displayName: "Sneha",
      handles: [
        { platform: "instagram" as const, handle: "tmksofficial" },
        { platform: "tiktok" as const, handle: "tmksofficialtiktok" },
      ],
    },
  ];

  it("refuses to merge when handles on the same platform disagree", () => {
    const { groups, conflicts } = findDuplicateGroups(sneha);
    expect(groups).toHaveLength(0);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].name).toBe("Sneha");
    expect(conflicts[0].platform).toBe("instagram");
  });

  it("still merges a shared name when the handles agree", () => {
    const { groups, conflicts } = findDuplicateGroups([
      {
        rowNumber: 1,
        displayName: "Same Person",
        handles: [{ platform: "instagram", handle: "same.person" }],
      },
      {
        // Same handle, differently punctuated, which normalises to a match.
        rowNumber: 2,
        displayName: "Same Person",
        handles: [{ platform: "instagram", handle: "same_person" }],
      },
    ]);
    expect(conflicts).toHaveLength(0);
    expect(groups).toHaveLength(1);
  });

  it("still merges a shared name when the platforms never overlap", () => {
    const { groups, conflicts } = findDuplicateGroups([
      {
        rowNumber: 1,
        displayName: "Split Record",
        handles: [{ platform: "facebook", handle: "abc" }],
      },
      {
        rowNumber: 2,
        displayName: "Split Record",
        handles: [{ platform: "youtube", handle: "xyz" }],
      },
    ]);
    expect(conflicts).toHaveLength(0);
    expect(groups).toHaveLength(1);
  });
});
