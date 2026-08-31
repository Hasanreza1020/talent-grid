/**
 * End-to-end test of the import transform against the real Travel file.
 * This is the regression net for the whole cleaning pipeline: if a future
 * change to parsing, handle extraction or dedup breaks the known dataset,
 * these assertions fail rather than the wrong numbers reaching the database.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "csv-parse/sync";

import { transformRows, cleanCell, preferredDisplayName, type SourceRow } from "@/lib/import/transform";
import { slugify, uniqueSlug } from "@/lib/slug";

const csv = readFileSync(
  resolve(import.meta.dirname, "../scripts/data/Influencer_Database_-_Travel.csv"),
  "utf8",
);
const rows = parse(csv, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  bom: true,
}) as SourceRow[];

const result = transformRows(rows);
const byName = (name: string) => result.creators.find((c) => c.displayName === name)!;

describe("cleanCell", () => {
  it("strips the \\r\\n that several source names carry", () => {
    expect(cleanCell("Rafi The Little Traveler\r\n")).toBe("Rafi The Little Traveler");
    expect(cleanCell("  Movewith Mamun Official  ")).toBe("Movewith Mamun Official");
    expect(cleanCell(undefined)).toBe("");
  });
});

describe("preferredDisplayName", () => {
  it("keeps the readable spelling over the run-together one", () => {
    expect(
      preferredDisplayName(["jannatthelunatictraveler", "Jannat The Lunatic Traveler"]),
    ).toBe("Jannat The Lunatic Traveler");
  });
});

describe("slugify", () => {
  it("closes up apostrophes rather than turning them into separators", () => {
    expect(slugify("Mr. Mixer's World")).toBe("mr-mixers-world");
    expect(slugify("Tonoy Let's Go")).toBe("tonoy-lets-go");
  });

  it("falls back to a handle when the name has no Latin characters", () => {
    const taken = new Set<string>();
    expect(
      uniqueSlug({ displayName: "ভ্রমণ বাংলাদেশ", fallbackHandles: ["bhromonbd"] }, taken),
    ).toBe("bhromonbd");
  });

  it("suffixes on collision", () => {
    const taken = new Set<string>();
    expect(uniqueSlug({ displayName: "Md Fizz" }, taken)).toBe("md-fizz");
    expect(uniqueSlug({ displayName: "Md Fizz" }, taken)).toBe("md-fizz-2");
    expect(uniqueSlug({ displayName: "Md Fizz" }, taken)).toBe("md-fizz-3");
  });
});

describe("the Travel file", () => {
  it("reads 25 source rows", () => {
    expect(result.sourceRowCount).toBe(25);
  });

  it("produces 23 creators, because two duplicate pairs are merged", () => {
    expect(result.creators).toHaveLength(23);
    expect(result.merges).toHaveLength(2);
  });

  it("parses every populated follower value without a single failure", () => {
    expect(result.failures).toEqual([]);
  });

  it("stores follower counts as integers, never as the source strings", () => {
    for (const creator of result.creators) {
      for (const account of creator.accounts) {
        expect(
          account.followers === null || Number.isInteger(account.followers),
          `${creator.displayName} ${account.platform}`,
        ).toBe(true);
      }
    }
  });

  it("converts the specific shorthands correctly", () => {
    expect(byName("Salahuddin Sumon").accounts[0].followers).toBe(4_700_000);
    expect(byName("Shurovy Yeasmin").accounts[0].followers).toBe(445_000);
    expect(byName("Kawser Ahmed Abid").accounts[0].followers).toBe(17_200);
    expect(
      byName("Nadir On The Go").accounts.find((a) => a.platform === "tiktok")!.followers,
    ).toBe(447_800);
    expect(
      byName("theshakibreviews").accounts.find((a) => a.platform === "tiktok")!.followers,
    ).toBe(88_300);
    expect(
      byName("Md Fizz").accounts.find((a) => a.platform === "youtube")!.followers,
    ).toBe(1_510_000);
  });

  it("merges the two Rafi rows into one creator holding both platforms", () => {
    const rafi = byName("Rafi The Little Traveler");
    expect(rafi.rowNumbers).toEqual([13, 14]);
    expect(rafi.accounts.map((a) => a.platform).sort()).toEqual(["facebook", "tiktok"]);
    expect(rafi.accounts.find((a) => a.platform === "facebook")!.followers).toBe(487_000);
    expect(rafi.accounts.find((a) => a.platform === "tiktok")!.followers).toBe(6_100);
  });

  it("merges the two Jannat rows into one creator with three accounts", () => {
    const jannat = byName("Jannat The Lunatic Traveler");
    expect(jannat.rowNumbers).toEqual([11, 24]);
    expect(jannat.accounts.map((a) => a.platform).sort()).toEqual([
      "facebook",
      "tiktok",
      "youtube",
    ]);
  });

  it("does not merge the genuinely different Travel-prefixed creators", () => {
    const names = result.creators.map((c) => c.displayName);
    expect(names).toContain("Travel With Naimur");
    expect(names).toContain("Travel With Naim Sheikh");
    expect(names).toContain("Travel A One");
    expect(names).toContain("Travel by shimul");
  });

  it("strips tracking parameters from every URL", () => {
    for (const creator of result.creators) {
      for (const account of creator.accounts) {
        expect(account.profileUrl).not.toContain("is_from_webapp");
        expect(account.profileUrl).not.toContain("sender_device");
        expect(account.profileUrl).not.toContain("si=");
        expect(account.profileUrl).not.toContain("__tn__");
      }
    }
  });

  it("keeps the id parameter that a profile.php URL depends on", () => {
    const tanvir = byName("Tanvir Opu").accounts[0];
    expect(tanvir.profileUrl).toBe("https://www.facebook.com/profile.php?id=658699142");
    expect(tanvir.handle).toBe("658699142");
    expect(tanvir.numericProfileId).toBe(true);
  });

  it("extracts handles from real profile URLs", () => {
    expect(byName("Shurovy Yeasmin").accounts[0].handle).toBe("shurovyyeasmin");
    expect(byName("Kawser Ahmed Abid").accounts[0].handle).toBe("KawserAhmedAbid");
    expect(
      byName("Nadir On The Go").accounts.find((a) => a.platform === "tiktok")!.handle,
    ).toBe("nadironthegobangla");
    expect(byName("Travel With Naimur").accounts.find((a) => a.platform === "facebook")!.handle)
      .toBe("Travelwithnaimur10");
  });

  it("refuses to treat a post id as a handle", () => {
    const shimul = byName("Travel by shimul").accounts.find((a) => a.platform === "facebook")!;
    expect(shimul.handle).toBeNull();
    expect(shimul.unresolvedReason).toMatch(/post/);
    // The follower count and URL survive even though the handle does not.
    expect(shimul.followers).toBe(212_000);
    expect(shimul.profileUrl).toContain("facebook.com/share/p/");
  });

  it("refuses to treat a video id as a channel handle", () => {
    const bd = byName("Bd travellers").accounts[0];
    expect(bd.platform).toBe("youtube");
    expect(bd.handle).toBeNull();
    expect(bd.followers).toBe(620_000);
  });

  it("reports the empty columns rather than creating fields for them", () => {
    expect(result.emptyColumns).toEqual(
      expect.arrayContaining([
        "Instagram",
        "IG Followers",
        "Description",
        "Budget",
        "Phone No",
        "Email",
      ]),
    );
  });

  it("drops Target Age Group deliberately", () => {
    expect(result.droppedColumns).toContain("Target Age Group");
  });

  it("gives every creator a unique slug", () => {
    const slugs = result.creators.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toContain("mr-mixers-world");
    expect(slugs).toContain("tonoy-lets-go");
  });

  it("invents nothing: no bios, rates, contacts or engagement data", () => {
    for (const creator of result.creators) {
      expect(creator.nullFields).toContain("bio_short");
      expect(creator.nullFields).toContain("rate_cards");
      expect(creator.nullFields).toContain("contacts");
      expect(creator.nullFields).toContain("engagement_rate");
    }
  });
});
