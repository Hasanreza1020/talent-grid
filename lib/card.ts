/**
 * The shape a creator card renders from.
 *
 * This lives outside the card component on purpose. The card itself is a
 * client component (it owns the compare checkbox), and a function exported
 * from a "use client" module cannot be called by a Server Component, only
 * rendered or passed as a prop. Keeping the mapper here lets the server pages
 * build card data directly.
 */

import type { DirectoryRow } from "./db/creators";
import { PLATFORM_LABEL, PLATFORMS, type Platform } from "./types";

export type CardAccount = {
  platform: Platform;
  platformLabel: string;
  handle: string | null;
  followers: number | null;
  isPrimary: boolean;
};

export type CardData = {
  slug: string;
  displayName: string;
  portraitUrl: string | null;
  primaryHandle: string | null;
  primaryPlatformLabel: string | null;
  primaryCategoryName: string | null;
  followers: number | null;
  engagementRate: number | null;
  engagementLabel: string;
  tagLabels: string[];
  /** One row per platform the creator is actually on, primary first. */
  accounts: CardAccount[];
};

export function toCardData(
  row: DirectoryRow,
  engagement: { value: number | null; qualifier?: string },
): CardData {
  return {
    slug: row.slug,
    displayName: row.displayName,
    portraitUrl: row.portraitUrl,
    primaryHandle: row.primaryHandle,
    primaryPlatformLabel: row.primaryPlatform ? PLATFORM_LABEL[row.primaryPlatform] : null,
    primaryCategoryName: row.primaryCategoryName,
    followers: row.primaryFollowers,
    engagementRate: engagement.value,
    engagementLabel:
      engagement.qualifier === "by_followers" ? "ER by followers" : "Engagement rate",
    tagLabels: row.tags.map((tag) => tag.label),
    accounts: [...row.accounts]
      // Fixed platform order, then primary first, so the icons sit in the same
      // place on every card and the eye can scan down a column of them.
      .sort(
        (a, b) =>
          Number(b.isPrimary) - Number(a.isPrimary) ||
          PLATFORMS.indexOf(a.platform) - PLATFORMS.indexOf(b.platform),
      )
      .map((account) => ({
        platform: account.platform,
        platformLabel: PLATFORM_LABEL[account.platform],
        handle: account.handle,
        followers: account.latest?.followers ?? null,
        isPrimary: account.isPrimary,
      })),
  };
}
