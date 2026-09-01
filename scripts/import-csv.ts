/**
 * Imports one category spreadsheet into Talent Grid.
 *
 *   pnpm import:csv -- --file scripts/data/Influencer_Database_-_Travel.csv \
 *                      --category Travel
 *
 * Dry run by default. Pass --commit to write. Re-running with --commit is
 * safe: creators are matched on their normalised name, accounts on
 * (creator, platform), and metric snapshots on (account, captured_on), so a
 * second run updates nothing it should not and inserts nothing twice.
 *
 * Nothing is invented. Anything the source does not supply is left null and
 * listed in scripts/output/import-report.md.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseSpreadsheet } from "../lib/import/parse-file";

import { createWriteClient } from "./supabase-admin";
import { transformRows, type TransformResult } from "../lib/import/transform";
import { normaliseName } from "../lib/dedup";
import { PLATFORM_LABEL } from "../lib/types";

type Args = { file: string; category: string; commit: boolean; reportPath: string };

function parseArgs(argv: string[]): Args {
  const get = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const file = get("file");
  const category = get("category");

  if (!file || !category) {
    console.error(
      "Usage: tsx scripts/import-csv.ts --file <path.csv> --category <name> [--commit]\n" +
        "       Runs as a dry run unless --commit is given.",
    );
    process.exit(1);
  }

  return {
    file: resolve(file),
    category,
    commit: argv.includes("--commit"),
    reportPath: resolve(get("report") ?? "scripts/output/import-report.md"),
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Report -------------------------------------------------------------------

function buildReport(
  args: Args,
  result: TransformResult,
  outcome: { inserted: number; updated: number; snapshots: number; skipped: number } | null,
): string {
  const lines: string[] = [];
  const totalAccounts = result.creators.reduce((sum, c) => sum + c.accounts.length, 0);
  const accountsWithFollowers = result.creators.reduce(
    (sum, c) => sum + c.accounts.filter((a) => a.followers !== null).length,
    0,
  );

  lines.push(`# Import report`);
  lines.push("");
  lines.push(`- Source file: \`${args.file}\``);
  lines.push(`- Category: ${args.category}`);
  lines.push(`- Run at: ${new Date().toISOString()}`);
  lines.push(`- Mode: ${args.commit ? "committed to the database" : "dry run, nothing written"}`);
  lines.push("");

  lines.push(`## Totals`);
  lines.push("");
  lines.push(`| | |`);
  lines.push(`| --- | --- |`);
  lines.push(`| Source rows read | ${result.sourceRowCount} |`);
  lines.push(`| Blank separator rows skipped | ${result.blankRows.length} |`);
  lines.push(`| Creators after merging | ${result.creators.length} |`);
  lines.push(`| Rows merged away | ${result.sourceRowCount - result.creators.length} |`);
  lines.push(`| Accounts created | ${totalAccounts} |`);
  lines.push(`| Accounts with a follower count | ${accountsWithFollowers} |`);
  lines.push(`| Follower values that failed to parse | ${result.failures.length} |`);
  lines.push(`| Accounts with no resolvable handle | ${result.unresolvedHandles.length} |`);
  if (outcome) {
    lines.push(`| Creators inserted | ${outcome.inserted} |`);
    lines.push(`| Creators already present and updated | ${outcome.updated} |`);
    lines.push(`| Metric snapshots inserted | ${outcome.snapshots} |`);
    lines.push(`| Snapshots skipped as already recorded today | ${outcome.skipped} |`);
  }
  lines.push("");

  // Merges
  lines.push(`## Merge decisions`);
  lines.push("");
  if (result.merges.length === 0) {
    lines.push("No duplicate rows were detected.");
  } else {
    lines.push(
      "Every merge below was decided automatically and is listed so it can be " +
        "reviewed. If any of these are wrong, correct them in the admin UI: the " +
        "merge is recorded here, not hidden.",
    );
    lines.push("");
    for (const merge of result.merges) {
      lines.push(`### Rows ${merge.rowNumbers.join(" and ")} to "${merge.keptName}"`);
      lines.push("");
      for (const reason of merge.reasoning) lines.push(`- ${reason}`);
      lines.push(
        `- Result: one creator with ${merge.accountsAfterMerge} account(s), ` +
          `taking the union of both rows and the highest follower value per platform.`,
      );
      lines.push("");
    }
  }
  lines.push("");

  // Parse failures
  lines.push(`## Values that could not be parsed`);
  lines.push("");
  if (result.failures.length === 0) {
    lines.push("Every populated value parsed cleanly.");
  } else {
    lines.push("These were left null rather than guessed at.");
    lines.push("");
    lines.push(`| Row | Creator | Column | Raw value | Why |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const failure of result.failures) {
      lines.push(
        `| ${failure.rowNumber} | ${failure.creatorName} | ${failure.column} | ` +
          `\`${failure.rawValue}\` | ${failure.reason} |`,
      );
    }
  }
  lines.push("");

  // Unresolved handles
  lines.push(`## Accounts with no resolvable handle`);
  lines.push("");
  if (result.unresolvedHandles.length === 0) {
    lines.push("Every profile URL yielded a handle.");
  } else {
    lines.push(
      "These rows hold a post permalink or a video link rather than a profile " +
        "URL. The last path segment of such a link is a post id, not a handle, so " +
        "the handle was left null instead of storing something that looks like a " +
        "handle but is not. The follower count and the URL were still imported. " +
        "Replacing these with real profile URLs is the highest-value cleanup on " +
        "this dataset.",
    );
    lines.push("");
    lines.push(`| Row | Creator | Platform | URL | Why |`);
    lines.push(`| --- | --- | --- | --- | --- |`);
    for (const item of result.unresolvedHandles) {
      lines.push(
        `| ${item.rowNumbers.join(", ")} | ${item.creatorName} | ` +
          `${PLATFORM_LABEL[item.platform]} | \`${item.url}\` | ${item.reason} |`,
      );
    }
  }
  lines.push("");

  // Same name, different person
  if (result.nameConflicts.length) {
    lines.push(`## Same name, different people`);
    lines.push("");
    lines.push(
      "These rows share a name but carry different handles on the same platform, " +
        "so they are different accounts and were imported as separate creators. " +
        "Merging them on the name alone would have fused two real people into one " +
        "record. Worth confirming, since the reverse mistake is also possible: one " +
        "person who changed handles.",
    );
    lines.push("");
    lines.push(`| Rows | Name | Platform | Handles |`);
    lines.push(`| --- | --- | --- | --- |`);
    for (const conflict of result.nameConflicts) {
      lines.push(
        `| ${conflict.rows.join(" and ")} | ${conflict.name} | ` +
          `${PLATFORM_LABEL[conflict.platform]} | ` +
          `\`${conflict.handles[0]}\` vs \`${conflict.handles[1]}\` |`,
      );
    }
    lines.push("");
  }

  // One URL claimed by several creators
  if (result.sharedUrls.length) {
    lines.push(`## One URL, more than one creator`);
    lines.push("");
    lines.push(
      "These are not duplicates the matcher missed. They are different creators " +
        "pointing at the same link, which means the sheet has a copy-paste error " +
        "and at least one of them leads somewhere wrong. There is no way to tell " +
        "from here which one, so both were imported exactly as given.",
    );
    lines.push("");
    lines.push(`| URL | Claimed by |`);
    lines.push(`| --- | --- |`);
    for (const shared of result.sharedUrls) {
      lines.push(`| \`${shared.url}\` | ${shared.creators.join(", ")} |`);
    }
    lines.push("");
  }

  // Columns
  lines.push(`## Columns dropped`);
  lines.push("");
  if (result.emptyColumns.length) {
    lines.push(
      `Empty in every row of the source, so no fields were created for them: ` +
        result.emptyColumns.map((c) => `\`${c}\``).join(", ") + ".",
    );
    lines.push("");
  }
  for (const column of result.droppedColumns) {
    lines.push(
      `\`${column}\` was dropped deliberately: every populated value is ` +
        `"All ages", which carries no information. Real age data belongs in ` +
        `audience_profiles.`,
    );
  }
  lines.push("");

  // Nulls
  lines.push(`## Fields left null for every imported creator`);
  lines.push("");
  lines.push(
    "This spreadsheet format carries none of the following, so they are null on " +
      "every record. They are not zero, and the UI renders them as \"No data\".",
  );
  lines.push("");
  const nullFields = result.creators[0]?.nullFields ?? [];
  for (const field of nullFields) lines.push(`- \`${field}\``);
  lines.push("");
  lines.push(
    "`tier` and `primary_platform` are computed by the database from the " +
      "imported follower counts, and stay null for any creator with no follower " +
      "data at all.",
  );
  lines.push("");

  // Notes
  if (result.notes.length) {
    lines.push(`## Notes`);
    lines.push("");
    for (const note of result.notes) lines.push(`- ${note}`);
    lines.push("");
  }

  // Per creator
  lines.push(`## Creators`);
  lines.push("");
  lines.push(`| Row(s) | Name | Slug | Accounts | Followers by platform |`);
  lines.push(`| --- | --- | --- | --- | --- |`);
  for (const creator of result.creators) {
    const followers = creator.accounts
      .map(
        (account) =>
          `${PLATFORM_LABEL[account.platform]} ` +
          `${account.followers === null ? "no data" : account.followers.toLocaleString()}`,
      )
      .join("; ");
    lines.push(
      `| ${creator.rowNumbers.join(", ")} | ${creator.displayName} | ` +
        `\`${creator.slug}\` | ${creator.accounts.length} | ${followers || "none"} |`,
    );
  }
  lines.push("");

  return lines.join("\n");
}

// Database -----------------------------------------------------------------

async function commitToDatabase(args: Args, result: TransformResult) {
  const supabase = await createWriteClient();
  const capturedOn = today();

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, name")
    .ilike("name", args.category)
    .maybeSingle();

  if (categoryError) throw categoryError;
  if (!category) {
    throw new Error(
      `Category "${args.category}" does not exist. Categories are seeded by ` +
        `migration 20260831000700_seed_categories.sql; add it there rather than ` +
        `creating it on the fly.`,
    );
  }

  const outcome = { inserted: 0, updated: 0, snapshots: 0, skipped: 0 };

  // Existing creators, matched on the normalised name so a re-run updates
  // rather than duplicates.
  const { data: existingRows, error: existingError } = await supabase
    .from("creators")
    .select("id, display_name, slug");
  if (existingError) throw existingError;

  const existingByName = new Map<string, { id: string; slug: string }>();
  for (const row of existingRows ?? []) {
    existingByName.set(normaliseName(row.display_name), { id: row.id, slug: row.slug });
  }

  for (const creator of result.creators) {
    const key = normaliseName(creator.displayName);
    const existing = existingByName.get(key);
    let creatorId: string;

    if (existing) {
      creatorId = existing.id;
      outcome.updated += 1;
    } else {
      const { data: inserted, error } = await supabase
        .from("creators")
        .insert({
          slug: creator.slug,
          display_name: creator.displayName,
          country: "Bangladesh",
          primary_language: "bangla",
          gender: "undisclosed",
          status: "active",
          data_confidence: "unverified",
          source: "legacy_import",
        })
        .select("id")
        .single();
      if (error) throw error;
      creatorId = inserted.id;
      outcome.inserted += 1;
      existingByName.set(key, { id: creatorId, slug: creator.slug });
    }

    // Primary category, idempotent.
    const { error: categoryLinkError } = await supabase
      .from("creator_categories")
      .upsert(
        { creator_id: creatorId, category_id: category.id, is_primary: true },
        { onConflict: "creator_id,category_id" },
      );
    if (categoryLinkError) throw categoryLinkError;

    for (const account of creator.accounts) {
      const { data: accountRow, error: accountError } = await supabase
        .from("accounts")
        .upsert(
          {
            creator_id: creatorId,
            platform: account.platform,
            handle: account.handle,
            profile_url: account.profileUrl,
          },
          { onConflict: "creator_id,platform" },
        )
        .select("id")
        .single();
      if (accountError) throw accountError;

      if (account.followers === null) continue;

      // Snapshots are append-only. An existing row for today is left exactly
      // as it is rather than overwritten.
      const { data: snapshotRow, error: snapshotError } = await supabase
        .from("metric_snapshots")
        .select("id")
        .eq("account_id", accountRow.id)
        .eq("captured_on", capturedOn)
        .maybeSingle();
      if (snapshotError) throw snapshotError;

      if (snapshotRow) {
        outcome.skipped += 1;
        continue;
      }

      const { error: insertSnapshotError } = await supabase.from("metric_snapshots").insert({
        account_id: accountRow.id,
        captured_on: capturedOn,
        followers: account.followers,
        source: "legacy_import",
      });
      if (insertSnapshotError) throw insertSnapshotError;
      outcome.snapshots += 1;
    }
  }

  return outcome;
}

// Entry point ---------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const { rows, delimiter } = parseSpreadsheet(readFileSync(args.file, "utf8"));
  console.log(`Parsed as ${delimiter === "	" ? "tab" : "comma"}-separated, ${rows.length} rows.`);

  const result = transformRows(rows);

  let outcome = null;
  if (args.commit) {
    outcome = await commitToDatabase(args, result);
  }

  mkdirSync(dirname(args.reportPath), { recursive: true });
  writeFileSync(args.reportPath, buildReport(args, result, outcome), "utf8");

  console.log(
    `${args.commit ? "Imported" : "Dry run"}: ${result.sourceRowCount} source rows to ` +
      `${result.creators.length} creators, ` +
      `${result.merges.length} merge(s), ` +
      `${result.failures.length} parse failure(s), ` +
      `${result.unresolvedHandles.length} unresolved handle(s).`,
  );
  if (outcome) {
    console.log(
      `Inserted ${outcome.inserted} creator(s), updated ${outcome.updated}, ` +
        `added ${outcome.snapshots} snapshot(s).`,
    );
  }
  console.log(`Report written to ${args.reportPath}`);
  if (!args.commit) console.log("Nothing was written. Re-run with --commit to apply.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
