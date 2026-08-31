import type { MetricResult } from "./types";
import { noData } from "./types";

export type SnapshotPoint = { capturedOn: string; followers: number | null };

function daysBetween(a: string, b: string): number {
  const ms = new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * ((latest followers - followers at the snapshot nearest N days prior)
 *   / followers at that snapshot) * 100
 *
 * Null when fewer than two snapshots carry a follower count, which is the
 * normal state immediately after a legacy import.
 */
export function followerGrowth(
  snapshots: SnapshotPoint[],
  windowDays: number,
): MetricResult {
  const usable = snapshots
    .filter((s): s is { capturedOn: string; followers: number } => s.followers !== null)
    .sort((a, b) => b.capturedOn.localeCompare(a.capturedOn));

  const inputs: Record<string, number | string | null> = {
    "Snapshots on record": usable.length,
    "Window (days)": windowDays,
  };

  if (usable.length < 2) {
    return noData(
      usable.length === 0
        ? "No follower snapshots recorded."
        : "Only one follower snapshot recorded. Trend available after the next update.",
      inputs,
    );
  }

  const latest = usable[0];

  // Find the earlier snapshot whose age is closest to the requested window.
  let nearest = usable[1];
  let nearestDistance = Math.abs(daysBetween(latest.capturedOn, nearest.capturedOn) - windowDays);
  for (const candidate of usable.slice(1)) {
    const distance = Math.abs(
      daysBetween(latest.capturedOn, candidate.capturedOn) - windowDays,
    );
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  const gap = daysBetween(latest.capturedOn, nearest.capturedOn);
  inputs["Latest snapshot"] = latest.capturedOn;
  inputs["Latest followers"] = latest.followers;
  inputs["Compared snapshot"] = nearest.capturedOn;
  inputs["Compared followers"] = nearest.followers;
  inputs["Actual gap (days)"] = gap;

  if (nearest.followers === 0) {
    return noData("The earlier snapshot records zero followers, so growth is undefined.", inputs);
  }

  const gapNote =
    Math.abs(gap - windowDays) > windowDays * 0.5
      ? ` The nearest available snapshot is ${gap} days back rather than ${windowDays}, ` +
        `so read this as an approximation.`
      : "";

  return {
    value: ((latest.followers - nearest.followers) / nearest.followers) * 100,
    basis:
      `${latest.followers.toLocaleString()} followers on ${latest.capturedOn} against ` +
      `${nearest.followers.toLocaleString()} on ${nearest.capturedOn}.${gapNote}`,
    inputs,
  };
}

export const growth30d = (snapshots: SnapshotPoint[]) => followerGrowth(snapshots, 30);
export const growth90d = (snapshots: SnapshotPoint[]) => followerGrowth(snapshots, 90);
