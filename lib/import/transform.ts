/**
 * The pure half of the CSV importer: source rows in, cleaned and deduplicated
 * creator records out, with a full account of everything that could not be
 * parsed. It touches no database and no filesystem, so it can be unit-tested
 * directly and reused by the /admin/import preview screen.
 */

import { parseFollowerCount } from "../parse-followers";
import { detectPlatform, extractHandle } from "../handles";
import { findDuplicateGroups, type DedupCandidate, type DedupGroup } from "../dedup";
import { uniqueSlug } from "../slug";
import type { Platform } from "../types";

export type SourceRow = Record<string, string>;

/** Maps the wide spreadsheet layout onto platforms. */
export const PLATFORM_COLUMNS: {
  platform: Platform;
  urlColumn: string;
  followerColumn: string;
}[] = [
  { platform: "facebook", urlColumn: "Facebook", followerColumn: "FB Followers" },
  { platform: "instagram", urlColumn: "Instagram", followerColumn: "IG Followers" },
  { platform: "tiktok", urlColumn: "Tiktok", followerColumn: "Tiktok Followers" },
  { platform: "youtube", urlColumn: "Youtube", followerColumn: "YT Subscribers" },
];

/**
 * Every populated value in this column is "All ages", which carries no
 * information. Real age data belongs in audience_profiles.
 */
export const ALWAYS_DROPPED_COLUMNS = ["Target Age Group"];

export type ParsedAccount = {
  platform: Platform;
  handle: string | null;
  profileUrl: string;
  followers: number | null;
  /** Set when the URL carried no resolvable handle. */
  unresolvedReason?: string;
  /** facebook.com/profile.php?id=NNN, which cannot be verified from the id alone. */
  numericProfileId?: boolean;
  sourceRow: number;
};

export type ParsedCreator = {
  /** Source rows that were combined into this creator. */
  rowNumbers: number[];
  displayName: string;
  slug: string;
  accounts: ParsedAccount[];
  /** Fields left null because the source had nothing to put in them. */
  nullFields: string[];
};

export type ParseFailure = {
  rowNumber: number;
  creatorName: string;
  column: string;
  rawValue: string;
  reason: string;
};

export type MergeRecord = {
  rowNumbers: number[];
  keptName: string;
  reasoning: string[];
  accountsAfterMerge: number;
};

export type TransformResult = {
  creators: ParsedCreator[];
  failures: ParseFailure[];
  merges: MergeRecord[];
  /** Columns present in the file but empty in every row. */
  emptyColumns: string[];
  droppedColumns: string[];
  unresolvedHandles: {
    rowNumbers: number[];
    creatorName: string;
    platform: Platform;
    url: string;
    reason: string;
  }[];
  /** Fully empty separator rows, skipped rather than reported as failures. */
  blankRows: number[];
  notes: string[];
  sourceRowCount: number;
};

/** Trims and removes the stray \r and \n that several source cells carry. */
export function cleanCell(value: string | undefined | null): string {
  if (value === undefined || value === null) return "";
  return value.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Fields the data model supports but this spreadsheet format never provides.
 * Listed explicitly so the report can state what was left null rather than
 * quietly filling them in.
 */
const NEVER_SUPPLIED_BY_CSV = [
  "bio_short",
  "bio_long",
  "portrait_url",
  "cover_url",
  "city",
  "legal_name",
  "accepts_barter",
  "typical_turnaround_days",
  "engagement_rate",
  "avg_views",
  "avg_likes",
  "avg_comments",
  "avg_shares",
  "posts_last_30d",
  "rate_cards",
  "contacts",
];

/**
 * When two rows describe the same person, the more human-readable spelling is
 * kept: the one with the most word breaks, falling back to the longer string.
 * "Jannat The Lunatic Traveler" beats "jannatthelunatictraveler".
 */
export function preferredDisplayName(names: string[]): string {
  return [...names].sort((a, b) => {
    const wordsA = a.trim().split(/\s+/).length;
    const wordsB = b.trim().split(/\s+/).length;
    if (wordsA !== wordsB) return wordsB - wordsA;
    return b.length - a.length;
  })[0];
}

export function transformRows(rows: SourceRow[]): TransformResult {
  const failures: ParseFailure[] = [];
  const blankRows: number[] = [];
  const notes: string[] = [];
  const unresolvedHandles: TransformResult["unresolvedHandles"] = [];

  const columns = rows.length ? Object.keys(rows[0]) : [];
  const emptyColumns = columns.filter((column) =>
    rows.every((row) => cleanCell(row[column]) === ""),
  );

  // Row 1 is the header, so the first data row is row 2 in a spreadsheet.
  type StagedRow = { rowNumber: number; displayName: string; accounts: ParsedAccount[] };
  const staged: StagedRow[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const displayName = cleanCell(row["Name"]);

    if (!displayName) {
      // The source sheets use fully blank rows as visual separators between
      // groups of creators. Those are skipped silently; a row that carries
      // data but no name is a genuine problem and is reported.
      const hasAnyValue = Object.values(row).some((value) => cleanCell(value) !== "");
      if (hasAnyValue) {
        failures.push({
          rowNumber,
          creatorName: "(no name)",
          column: "Name",
          rawValue: String(row["Name"] ?? ""),
          reason: "Row carries data but no name, so it cannot be imported.",
        });
      } else {
        blankRows.push(rowNumber);
      }
      return;
    }

    const accounts: ParsedAccount[] = [];

    for (const { platform, urlColumn, followerColumn } of PLATFORM_COLUMNS) {
      const rawUrl = cleanCell(row[urlColumn]);
      const rawFollowers = cleanCell(row[followerColumn]);
      if (!rawUrl && !rawFollowers) continue;

      if (!rawUrl) {
        failures.push({
          rowNumber,
          creatorName: displayName,
          column: followerColumn,
          rawValue: rawFollowers,
          reason:
            `A follower count was given with no ${urlColumn} URL, so there is no ` +
            `account to attach it to. Left out.`,
        });
        continue;
      }

      const detected = detectPlatform(rawUrl);
      if (detected && detected !== platform) {
        notes.push(
          `Row ${rowNumber} (${displayName}): the ${urlColumn} column holds a ` +
            `${detected} URL. Imported as ${detected}.`,
        );
      }
      const effectivePlatform = detected ?? platform;
      const extraction = extractHandle(rawUrl, effectivePlatform);

      const followers = parseFollowerCount(rawFollowers);
      if (!followers.ok) {
        failures.push({
          rowNumber,
          creatorName: displayName,
          column: followerColumn,
          rawValue: rawFollowers,
          reason: followers.reason,
        });
      } else if (followers.note) {
        notes.push(`Row ${rowNumber} (${displayName}): ${followers.note}`);
      }

      if (extraction.unresolvedReason) {
        unresolvedHandles.push({
          rowNumbers: [rowNumber],
          creatorName: displayName,
          platform: effectivePlatform,
          url: extraction.url,
          reason: extraction.unresolvedReason,
        });
      }

      accounts.push({
        platform: effectivePlatform,
        handle: extraction.handle,
        profileUrl: extraction.url,
        followers: followers.ok ? followers.value : null,
        unresolvedReason: extraction.unresolvedReason,
        numericProfileId: extraction.numericProfileId,
        sourceRow: rowNumber,
      });
    }

    staged.push({ rowNumber, displayName, accounts });
  });

  // Deduplication --------------------------------------------------------

  const candidates: DedupCandidate[] = staged.map((row) => ({
    rowNumber: row.rowNumber,
    displayName: row.displayName,
    handles: row.accounts
      .filter((account): account is ParsedAccount & { handle: string } => account.handle !== null)
      .map((account) => ({ platform: account.platform, handle: account.handle })),
  }));

  const groups: DedupGroup[] = findDuplicateGroups(candidates);
  const groupByRow = new Map<number, DedupGroup>();
  for (const group of groups) {
    for (const rowNumber of group.rowNumbers) groupByRow.set(rowNumber, group);
  }

  const merges: MergeRecord[] = [];
  const handled = new Set<number>();
  const takenSlugs = new Set<string>();
  const creators: ParsedCreator[] = [];

  for (const row of staged) {
    if (handled.has(row.rowNumber)) continue;

    const group = groupByRow.get(row.rowNumber);
    const members = group
      ? staged.filter((candidate) => group.rowNumbers.includes(candidate.rowNumber))
      : [row];
    for (const member of members) handled.add(member.rowNumber);

    const displayName = preferredDisplayName(members.map((member) => member.displayName));

    // Union of accounts, keeping the highest follower value per platform.
    const byPlatform = new Map<Platform, ParsedAccount>();
    for (const member of members) {
      for (const account of member.accounts) {
        const existing = byPlatform.get(account.platform);
        if (!existing) {
          byPlatform.set(account.platform, { ...account });
          continue;
        }

        // A row carrying a resolvable handle wins the URL and handle, because
        // a profile link is more useful than a post permalink. Follower counts
        // are compared independently: the highest known value wins.
        const preferred = existing.handle ? existing : account.handle ? account : existing;
        const followers = [existing.followers, account.followers].filter(
          (value): value is number => value !== null,
        );

        byPlatform.set(account.platform, {
          ...preferred,
          followers: followers.length ? Math.max(...followers) : null,
          numericProfileId: Boolean(existing.numericProfileId || account.numericProfileId),
        });
      }
    }

    const accounts = [...byPlatform.values()];

    if (members.length > 1) {
      merges.push({
        rowNumbers: members.map((member) => member.rowNumber),
        keptName: displayName,
        reasoning: (group?.links ?? []).map((link) => `Rows ${link.rows.join(" and ")}: ${link.reasoning}`),
        accountsAfterMerge: accounts.length,
      });
    }

    creators.push({
      rowNumbers: members.map((member) => member.rowNumber),
      displayName,
      slug: uniqueSlug(
        {
          displayName,
          fallbackHandles: accounts.map((account) => account.handle),
        },
        takenSlugs,
      ),
      accounts,
      nullFields: NEVER_SUPPLIED_BY_CSV,
    });
  }

  return {
    creators,
    failures,
    merges,
    emptyColumns,
    droppedColumns: ALWAYS_DROPPED_COLUMNS.filter((column) => columns.includes(column)),
    unresolvedHandles,
    blankRows,
    notes,
    sourceRowCount: rows.length,
  };
}
