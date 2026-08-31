import { describe, expect, it } from "vitest";
import { repairMojibake } from "@/lib/import/mojibake";

describe("repairMojibake", () => {
  it("repairs Bangla names mangled by a UTF-8 to CP1252 misread", () => {
    // These are the two names as they arrive in the Food sheet.
    expect(repairMojibake("à¦­à§‹à¦œà¦¨ à¦°à¦¸à¦¿à¦•à¥¤ Bhojon Roshik")).toEqual({
      text: "ভোজন রসিক। Bhojon Roshik",
      repaired: true,
    });
    expect(
      repairMojibake("Shikder Shaheb - à¦¶à¦¿à¦•à¦¦à¦¾à¦° à¦¸à¦¾à¦¹à§‡à¦¬").text,
    ).toBe("Shikder Shaheb - শিকদার সাহেব");
  });

  it("handles the CP1252-only bytes that a Latin-1 round trip cannot", () => {
    // U+2039 is the CP1252 reading of byte 0x8B, U+0153 of 0x9C. Both appear
    // inside the mangled Bangla above, so a Latin-1 repair silently fails.
    const withCp1252 = "à§‹";
    expect(repairMojibake(withCp1252).repaired).toBe(true);
  });

  it("leaves plain ASCII alone", () => {
    for (const name of ["Rafsan TheChotoBhai", "Mr. Mixer's World", "Food FM", ""]) {
      expect(repairMojibake(name)).toEqual({ text: name, repaired: false });
    }
  });

  it("leaves ordinary accented Latin text alone", () => {
    // A lone E9 byte is not valid UTF-8, so these must not be touched.
    for (const name of ["Café", "Zoë", "Renée", "Málaga", "Ångström"]) {
      expect(repairMojibake(name)).toEqual({ text: name, repaired: false });
    }
  });

  it("leaves correctly decoded non-Latin text alone", () => {
    for (const name of ["ভোজন রসিক", "শিকদার সাহেব", "日本語", "Привет"]) {
      expect(repairMojibake(name)).toEqual({ text: name, repaired: false });
    }
  });

  it("is idempotent, so a second import does not re-mangle a repaired name", () => {
    const once = repairMojibake("à¦­à§‹à¦œà¦¨ à¦°à¦¸à¦¿à¦•à¥¤ Bhojon Roshik").text;
    expect(repairMojibake(once)).toEqual({ text: once, repaired: false });
  });
});
