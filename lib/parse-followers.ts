/**
 * Follower-count parsing for legacy spreadsheet imports.
 *
 * The source spreadsheets record counts as human shorthand: "4.7m", "445k",
 * "447.8K", and at least one typo where a comma stands in for a decimal point
 * ("88,3k"). Everything downstream stores integers, so this is the single
 * place where that shorthand is interpreted.
 *
 * The governing rule is that a string which does not match a known pattern is
 * never guessed at. It is reported as a failure and the value is left null.
 */

export type FollowerParseResult =
  | { ok: true; value: number | null; note?: string }
  | { ok: false; reason: string };

const SUFFIX_SHIFT: Record<string, number> = { k: 3, m: 6 };

/**
 * Scales a decimal mantissa by a power of ten using string arithmetic, so that
 * "4.7" x 10^6 is exactly 4700000 rather than the 4700000.000000001 that
 * binary floating point produces.
 */
function shiftDecimal(intPart: string, fracPart: string, shift: number): number {
  const digits = `${intPart}${fracPart}`;
  const exponent = shift - fracPart.length;

  if (exponent >= 0) {
    return Number(`${digits}${"0".repeat(exponent)}`);
  }

  // More decimal places than the suffix can absorb, e.g. "1.2345k". Round to
  // the nearest whole follower; fractional people do not exist.
  const cut = digits.length + exponent;
  const whole = digits.slice(0, cut) || "0";
  const remainder = digits.slice(cut);
  const roundUp = remainder.length > 0 && Number(remainder[0]) >= 5;
  return Number(whole) + (roundUp ? 1 : 0);
}

export function parseFollowerCount(raw: string | null | undefined): FollowerParseResult {
  if (raw === null || raw === undefined) return { ok: true, value: null };

  // Strip whitespace including the \r\n that several source cells carry.
  const cleaned = raw.replace(/\s+/g, "").replace(/\+$/, "");
  if (cleaned === "") return { ok: true, value: null };

  const lowered = cleaned.toLowerCase();

  // Plain integer, optionally with thousands separators: "6000", "1,234,567".
  if (/^\d+$/.test(lowered)) {
    return { ok: true, value: Number(lowered) };
  }
  if (/^\d{1,3}(,\d{3})+$/.test(lowered)) {
    return { ok: true, value: Number(lowered.replace(/,/g, "")) };
  }

  const match = /^(\d+)(?:([.,])(\d+))?([km])$/.exec(lowered);
  if (!match) {
    return {
      ok: false,
      reason: `Unrecognised follower format: ${JSON.stringify(raw)}`,
    };
  }

  const [, intPart, separator, fracPart = "", suffix] = match;

  // "88,3k" is a typo for "88.3k". But "1,234k" could equally be 1.234k or
  // 1234k, and there is no way to tell, so it is refused rather than guessed.
  let note: string | undefined;
  if (separator === ",") {
    if (fracPart.length === 3) {
      return {
        ok: false,
        reason:
          `Ambiguous separator in ${JSON.stringify(raw)}: a comma before three ` +
          `digits could be a decimal point or a thousands separator.`,
      };
    }
    note = `Read the comma in ${JSON.stringify(raw)} as a decimal point.`;
  }

  const value = shiftDecimal(intPart, fracPart, SUFFIX_SHIFT[suffix]);
  return { ok: true, value, note };
}

/** Presentation-side inverse, used for card and table display. */
export function formatFollowerCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "No data";
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    const k = value / 1000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  const m = value / 1_000_000;
  return `${m % 1 === 0 ? m : m.toFixed(m < 10 ? 2 : 1).replace(/0$/, "")}m`;
}
