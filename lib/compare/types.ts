import type { MetricResult } from "../metrics/types";
import type { Deliverable, Platform } from "../types";

export type CompareOptions = {
  /** Restricts every metric to one platform, when the user picks one. */
  platform: Platform | null;
  deliverable: Deliverable | null;
  /** Percentile mode makes creators of different sizes comparable. */
  normalised: boolean;
};

export type CompareCell = {
  creatorId: string;
  display: string;
  /** Null means no data. Used for the best-value comparison. */
  value: number | null;
  result?: MetricResult;
  isBest?: boolean;
};

export type CompareRow = {
  key: string;
  label: string;
  direction: "higher" | "lower" | null;
  cells: CompareCell[];
  allMissing: boolean;
  /** Set when marking was suppressed, so the UI can explain why. */
  markingSuppressed: boolean;
};

export type CompareGroup = { key: string; label: string; rows: CompareRow[] };
