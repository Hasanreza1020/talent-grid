import type { DirectoryRow } from "./creators";
import { daysSince } from "@/lib/format";

export const STALE_SNAPSHOT_DAYS = 90;

export type HealthCheck = {
  key: string;
  label: string;
  description: string;
  count: number;
  /** Browse query string that reproduces exactly this list. */
  href: string;
};

/**
 * The admin backlog. Each entry is a filtered list the team can work through,
 * not a number on a dashboard, so every one carries the link that reproduces it.
 */
export function buildHealthChecks(rows: DirectoryRow[]): HealthCheck[] {
  const active = rows.filter((row) => row.deletedAt === null);

  const missingPortrait = active.filter((row) => row.portraitUrl === null);
  const missingEngagement = active.filter(
    (row) =>
      row.primaryAvgLikes === null &&
      row.primaryAvgComments === null &&
      row.primaryAvgShares === null,
  );
  const staleSnapshots = active.filter((row) => {
    const age = daysSince(row.primaryCapturedOn);
    return age !== null && age > STALE_SNAPSHOT_DAYS;
  });
  const noSnapshots = active.filter((row) => row.primaryCapturedOn === null);
  const noRateCard = active.filter((row) => row.cheapestRateBdt === null);
  const unverified = active.filter((row) => row.dataConfidence === "unverified");
  const noHandle = active.filter((row) =>
    row.accounts.some((account) => account.handle === null),
  );

  return [
    {
      key: "portrait",
      label: "Missing a portrait",
      description:
        "The portrait grid is the product. These records show initials until an image is added.",
      count: missingPortrait.length,
      href: "/creators?portrait=false&view=table",
    },
    {
      key: "engagement",
      label: "No engagement data",
      description:
        "Without likes, comments or shares there is no engagement rate, and no agency score.",
      count: missingEngagement.length,
      href: "/creators?view=table&sort=followers",
    },
    {
      key: "stale",
      label: `Snapshots older than ${STALE_SNAPSHOT_DAYS} days`,
      description: "Follower counts drift. These are old enough to be worth re-reading.",
      count: staleSnapshots.length,
      href: "/creators?view=table&sort=recent",
    },
    {
      key: "no-snapshots",
      label: "No follower snapshot at all",
      description: "Nothing has ever been recorded for these accounts.",
      count: noSnapshots.length,
      href: "/creators?view=table",
    },
    {
      key: "rate",
      label: "No rate card",
      description:
        "Cost per mille, cost per engagement and the rate filter all need at least one rate.",
      count: noRateCard.length,
      href: "/creators?view=table&sort=followers",
    },
    {
      key: "unverified",
      label: "Unverified records",
      description:
        "Imported from a spreadsheet and never checked against the platform.",
      count: unverified.length,
      href: "/creators?confidence=unverified&view=table",
    },
    {
      key: "handle",
      label: "Account with no handle",
      description:
        "The source held a post link rather than a profile link, so no handle could be resolved.",
      count: noHandle.length,
      href: "/creators?view=table",
    },
  ];
}
