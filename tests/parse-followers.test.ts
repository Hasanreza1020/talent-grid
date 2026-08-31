import { describe, expect, it } from "vitest";
import { parseFollowerCount, formatFollowerCount } from "@/lib/parse-followers";

function value(raw: string) {
  const result = parseFollowerCount(raw);
  if (!result.ok) throw new Error(`expected ${raw} to parse, got: ${result.reason}`);
  return result.value;
}

describe("parseFollowerCount", () => {
  it("parses every shorthand named in the spec", () => {
    expect(value("4.7m")).toBe(4_700_000);
    expect(value("445k")).toBe(445_000);
    expect(value("17.2k")).toBe(17_200);
    expect(value("447.8K")).toBe(447_800);
    expect(value("88,3k")).toBe(88_300);
    expect(value("1.51m")).toBe(1_510_000);
  });

  it("parses the remaining values in the Travel file", () => {
    expect(value("6k")).toBe(6_000);
    expect(value("139k")).toBe(139_000);
    expect(value("1.1m")).toBe(1_100_000);
    expect(value("813k")).toBe(813_000);
    expect(value("20.6K")).toBe(20_600);
    expect(value("2.2m")).toBe(2_200_000);
    expect(value("9.6k")).toBe(9_600);
    expect(value("35.2k")).toBe(35_200);
    expect(value("6.1k")).toBe(6_100);
    expect(value("23.7k")).toBe(23_700);
  });

  it("is case-insensitive on the suffix", () => {
    expect(value("1M")).toBe(1_000_000);
    expect(value("1m")).toBe(1_000_000);
    expect(value("5K")).toBe(5_000);
  });

  it("scales exactly, without floating point drift", () => {
    // 4.7 * 1e6 in binary floating point is 4700000.000000001
    expect(Number.isInteger(value("4.7m"))).toBe(true);
    expect(value("4.7m")).toBe(4_700_000);
    expect(value("1.005m")).toBe(1_005_000);
    expect(value("0.1k")).toBe(100);
  });

  it("accepts plain integers and thousands separators", () => {
    expect(value("6000")).toBe(6000);
    expect(value("1,234,567")).toBe(1_234_567);
    expect(value("0")).toBe(0);
  });

  it("treats blank and absent values as absent, not as zero", () => {
    expect(value("")).toBeNull();
    expect(value("   ")).toBeNull();
    expect(parseFollowerCount(null)).toEqual({ ok: true, value: null });
    expect(parseFollowerCount(undefined)).toEqual({ ok: true, value: null });
  });

  it("strips the whitespace that source cells carry", () => {
    expect(value(" 445k ")).toBe(445_000);
    expect(value("445k\r\n")).toBe(445_000);
    expect(value("4 . 7 m")).toBe(4_700_000);
  });

  it("notes when a comma was read as a decimal point", () => {
    const result = parseFollowerCount("88,3k");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.note).toMatch(/decimal point/);
  });

  it("refuses an ambiguous comma rather than guessing", () => {
    // 1,234k could be 1.234k or 1234k. There is no way to tell.
    const result = parseFollowerCount("1,234k");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/[Aa]mbiguous/);
  });

  it("reports unrecognised formats instead of inventing a number", () => {
    for (const raw of ["about 40k", "40k+ maybe", "n/a", "?", "12.3.4k", "1e6", "40b"]) {
      const result = parseFollowerCount(raw);
      expect(result.ok, `${raw} should not parse`).toBe(false);
    }
  });
});

describe("formatFollowerCount", () => {
  it("renders null as No data, never as zero", () => {
    expect(formatFollowerCount(null)).toBe("No data");
    expect(formatFollowerCount(undefined)).toBe("No data");
    expect(formatFollowerCount(0)).toBe("0");
  });

  it("round-trips the common shorthands", () => {
    expect(formatFollowerCount(445_000)).toBe("445k");
    expect(formatFollowerCount(17_200)).toBe("17.2k");
    expect(formatFollowerCount(4_700_000)).toBe("4.7m");
    expect(formatFollowerCount(620)).toBe("620");
  });
});
