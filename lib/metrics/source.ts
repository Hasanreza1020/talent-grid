/**
 * The metric ingestion boundary.
 *
 * Every metric that reaches the product passes through a MetricSource. Today
 * the only implementation is ManualMetricSource, which reads what a person
 * recorded through the admin form. When a platform API becomes available, it
 * is added by writing one new file that implements this interface and
 * registering it below: no page, component or query changes.
 *
 * The interface is deliberately narrow. fetchMetrics answers one question,
 * "what are this account's current figures", and returns null for anything it
 * genuinely does not know, so no adapter can invent a zero.
 */

import type { Platform, SnapshotSource } from "@/lib/types";

export type MetricSourceAccount = {
  id: string;
  platform: Platform;
  handle: string | null;
  profileUrl: string;
};

export type FetchedMetrics = {
  capturedOn: string;
  followers: number | null;
  avgViews: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  avgShares: number | null;
  postsLast30d: number | null;
  source: SnapshotSource;
};

export interface MetricSource {
  /** Identifies the adapter in the snapshot record and in the UI. */
  readonly key: string;
  readonly label: string;

  /**
   * The current figures for an account, or null when this source has nothing
   * for it. Never a zero standing in for an unknown.
   */
  fetchMetrics(account: MetricSourceAccount): Promise<FetchedMetrics | null>;
}

/**
 * Manual entry: figures come from a person reading them off the platform and
 * typing them into the admin form, which writes a dated snapshot directly.
 * There is nothing to fetch after the fact, so this returns null and the
 * stored snapshot history is the source of truth.
 */
export class ManualMetricSource implements MetricSource {
  readonly key = "manual";
  readonly label = "Recorded by hand";

  async fetchMetrics(): Promise<FetchedMetrics | null> {
    return null;
  }
}

const registry = new Map<string, MetricSource>();

export function registerMetricSource(source: MetricSource): void {
  registry.set(source.key, source);
}

export function getMetricSource(key: string): MetricSource | null {
  return registry.get(key) ?? null;
}

export function listMetricSources(): MetricSource[] {
  return [...registry.values()];
}

registerMetricSource(new ManualMetricSource());

// The YouTube adapter registers itself only when a key is configured, so the
// product behaves identically with the key absent: every metric falls back to
// what a person recorded by hand.
if (typeof process !== "undefined" && process.env?.YOUTUBE_API_KEY) {
  // Imported lazily so the browser bundle never pulls in the adapter.
  void import("./sources/youtube").then(({ YouTubeMetricSource }) => {
    registerMetricSource(new YouTubeMetricSource(process.env.YOUTUBE_API_KEY!));
  });
}

/**
 * Runs every registered source over an account and returns the first result.
 * Used by the refresh path in the admin UI; with only the manual source
 * registered it correctly reports that there is nothing to fetch.
 */
export async function fetchLatestMetrics(
  account: MetricSourceAccount,
): Promise<{ metrics: FetchedMetrics | null; sourceKey: string | null }> {
  for (const source of listMetricSources()) {
    const metrics = await source.fetchMetrics(account);
    if (metrics) return { metrics, sourceKey: source.key };
  }
  return { metrics: null, sourceKey: null };
}
