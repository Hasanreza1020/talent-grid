/**
 * Presentation helpers.
 *
 * The one rule that matters here: null is never rendered as zero, and never as
 * a bare dash that could be read as zero. It is the words "No data".
 */

export const NO_DATA = "No data";

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return NO_DATA;
  return value.toLocaleString("en-US");
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return NO_DATA;
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    const k = value / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  const m = value / 1_000_000;
  return `${Number.isInteger(m) ? m : m.toFixed(2).replace(/0$/, "")}m`;
}

export function formatBdt(value: number | null | undefined): string {
  if (value === null || value === undefined) return NO_DATA;
  return `BDT ${value.toLocaleString("en-US")}`;
}

export function formatPercent(
  value: number | null | undefined,
  fractionDigits = 2,
): string {
  if (value === null || value === undefined) return NO_DATA;
  return `${value.toFixed(fractionDigits)}%`;
}

export function formatSignedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return NO_DATA;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return NO_DATA;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return NO_DATA;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function daysSince(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86_400_000);
}

/** Initials for the placeholder portrait tile. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/** Tags render with a leading hash but are stored without one. */
export function hashTag(label: string): string {
  return `#${label.replace(/^#/, "")}`;
}
