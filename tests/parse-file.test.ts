import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { detectDelimiter, parseSpreadsheet } from "@/lib/import/parse-file";
import { transformRows } from "@/lib/import/transform";

const tsv = readFileSync(
  resolve(import.meta.dirname, "../scripts/data/Influencer_Database_-_Travel.tsv"),
  "utf8",
);
const csv = readFileSync(
  resolve(import.meta.dirname, "../scripts/data/Influencer_Database_-_Travel.csv"),
  "utf8",
);

describe("detectDelimiter", () => {
  it("reads the header rather than trusting the file extension", () => {
    expect(detectDelimiter(tsv)).toBe("\t");
    expect(detectDelimiter(csv)).toBe(",");
    // A tab-separated file handed over with a .csv name is a normal thing to
    // receive, and parsing it as one giant column is the worst failure mode.
    expect(detectDelimiter("Name\tCategory\tFacebook\nA\tB\tC")).toBe("\t");
  });
});

describe("the updated Travel sheet", () => {
  const result = transformRows(parseSpreadsheet(tsv).rows);
  const names = result.creators.map((creator) => creator.displayName);

  it("produces 20 creators from 22 named rows", () => {
    expect(result.creators).toHaveLength(20);
    expect(result.merges).toHaveLength(2);
  });

  it("skips blank separator rows silently rather than reporting them", () => {
    expect(result.blankRows.length).toBeGreaterThan(0);
    expect(result.failures).toEqual([]);
  });

  it("still merges the Rafi and Jannat duplicates", () => {
    expect(names.filter((name) => name.toLowerCase().includes("rafi"))).toHaveLength(1);
    expect(names.filter((name) => name.toLowerCase().includes("jannat"))).toHaveLength(1);
  });

  it("no longer contains the three creators dropped from the sheet", () => {
    expect(names).not.toContain("Tale by Jannatun's");
    expect(names).not.toContain("Travel A One");
    expect(names).not.toContain("Travel With Naim Sheikh");
  });

  it("keeps parsing the awkward follower values correctly", () => {
    const byName = (name: string) => result.creators.find((c) => c.displayName === name)!;
    expect(byName("Salahuddin Sumon").accounts[0].followers).toBe(4_700_000);
    expect(
      byName("theshakibreviews").accounts.find((a) => a.platform === "tiktok")!.followers,
    ).toBe(88_300);
    expect(
      byName("Nadir On The Go").accounts.find((a) => a.platform === "tiktok")!.followers,
    ).toBe(447_800);
  });

  it("trims the trailing spaces the sheet carries on several names", () => {
    expect(names).toContain("Movewith Mamun Official");
    expect(names).toContain("Next With Noman");
    expect(names).toContain("Araf Intisar Dipto");
  });
});
