/**
 * Refreshes metrics from a platform API and records them as dated snapshots.
 *
 *   pnpm refresh:metrics -- --platform youtube
 *   # dry run by default; add --commit to write
 *
 * Everything reaches the database as a new dated snapshot. Nothing is
 * overwritten, so a refresh adds to the follower history that growth and trend
 * figures are computed from rather than replacing it.
 *
 * Where a channel could only be found through a video link, the resolved
 * handle is written back to the account, which is how the accounts imported
 * with nothing but a youtu.be URL get a real handle.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { createWriteClient } from "./supabase-admin";
import { YouTubeMetricSource } from "../lib/metrics/sources/youtube";
import { FacebookMetricSource } from "../lib/metrics/sources/facebook";
import { profileUrlFor } from "../lib/handles";
import { formatCompact } from "../lib/format";
import type { FetchDetail, FetchedMetrics, MetricSource } from "../lib/metrics/source";

const SUPPORTED = ["youtube", "facebook"] as const;
type SupportedPlatform = (typeof SUPPORTED)[number];

type Args = {
  platform: SupportedPlatform;
  commit: boolean;
  reportPath: string;
  limit: number | null;
};

function parseArgs(argv: string[]): Args {
  const get = (name: string) => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const platform = get("platform") ?? "youtube";
  if (!(SUPPORTED as readonly string[]).includes(platform)) {
    console.error(
      `Unknown platform "${platform}". Implemented: ${SUPPORTED.join(", ")}. ` +
        `TikTok has no API open to a commercial agency, and Instagram needs a ` +
        `reviewed Meta app plus a linked Business account.`,
    );
    process.exit(1);
  }

  const limit = get("limit");
  return {
    platform: platform as SupportedPlatform,
    commit: argv.includes("--commit"),
    reportPath: resolve(get("report") ?? "scripts/output/metric-refresh-report.md"),
    limit: limit ? Number(limit) : null,
  };
}

/** The adapter for a platform, plus the label the report prints. */
type Adapter = {
  source: MetricSource & { lastError: string | null; lastDetail: FetchDetail | null };
  label: string;
};

function buildAdapter(platform: SupportedPlatform): Adapter {
  if (platform === "facebook") {
    const token = process.env.FACEBOOK_ACCESS_TOKEN;
    if (!token) {
      console.error(
        "Missing FACEBOOK_ACCESS_TOKEN. Create a Meta app, add the Facebook " +
          "Login or Business product, and generate a long-lived token. Reading " +
          "Pages the agency does not administer additionally needs Page Public " +
          "Content Access, granted through App Review and Business Verification.",
      );
      process.exit(1);
    }
    return {
      source: new FacebookMetricSource(token, process.env.FACEBOOK_API_VERSION),
      label: "Facebook Graph API",
    };
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing YOUTUBE_API_KEY. Create a Google Cloud project, enable the " +
        "YouTube Data API v3, create an API key, and put it in .env.local.",
    );
    process.exit(1);
  }
  return { source: new YouTubeMetricSource(apiKey), label: "YouTube Data API v3" };
}

type Outcome = {
  creator: string;
  handle: string | null;
  status: "ok" | "skipped" | "failed";
  detail: string;
  metrics?: FetchedMetrics;
  resolvedHandle?: string | null;
  title?: string | null;
  engagementReason?: string | null;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const { source, label } = buildAdapter(args.platform);
  const supabase = await createWriteClient();

  let query = supabase
    .from("accounts")
    .select("id, platform, handle, profile_url, creators(display_name, deleted_at)")
    .eq("platform", args.platform);
  if (args.limit) query = query.limit(args.limit);

  const { data: accounts, error } = await query;
  if (error) throw error;

  const live = (accounts ?? []).filter((account) => {
    const creator = Array.isArray(account.creators) ? account.creators[0] : account.creators;
    return creator && creator.deleted_at === null;
  });

  const outcomes: Outcome[] = [];
  let written = 0;
  let handlesBackfilled = 0;

  for (const account of live) {
    const creator = Array.isArray(account.creators) ? account.creators[0] : account.creators;
    const name = creator?.display_name ?? "Unknown creator";

    try {
      const metrics = await source.fetchMetrics({
        id: account.id,
        platform: args.platform,
        handle: account.handle,
        profileUrl: account.profile_url,
      });

      if (!metrics) {
        outcomes.push({
          creator: name,
          handle: account.handle,
          status: "skipped",
          detail: source.lastError ?? "The source returned nothing for this account.",
        });
        continue;
      }

      const detail = source.lastDetail;

      if (args.commit) {
        // A snapshot already recorded today is left exactly as it is. The
        // table is append-only; a second run on the same day is a no-op
        // rather than an overwrite.
        const { data: existing } = await supabase
          .from("metric_snapshots")
          .select("id")
          .eq("account_id", account.id)
          .eq("captured_on", metrics.capturedOn)
          .maybeSingle();

        if (!existing) {
          const { error: insertError } = await supabase.from("metric_snapshots").insert({
            account_id: account.id,
            captured_on: metrics.capturedOn,
            followers: metrics.followers,
            avg_views: metrics.avgViews,
            avg_likes: metrics.avgLikes,
            avg_comments: metrics.avgComments,
            avg_shares: metrics.avgShares,
            posts_last_30d: metrics.postsLast30d,
            source: metrics.source,
          });
          if (insertError) throw insertError;
          written += 1;
        }

        // Backfill a handle the import could not resolve, now that the API has
        // told us what the channel actually is.
        if (!account.handle && detail?.resolvedHandle) {
          const { error: handleError } = await supabase
            .from("accounts")
            .update({
              handle: detail.resolvedHandle,
              profile_url: profileUrlFor(args.platform, detail.resolvedHandle),
            })
            .eq("id", account.id);
          if (!handleError) handlesBackfilled += 1;
        }
      }

      outcomes.push({
        creator: name,
        handle: account.handle,
        status: "ok",
        detail: detail?.summaryLine ?? "",
        metrics,
        resolvedHandle: detail?.resolvedHandle ?? null,
        title: detail?.title ?? null,
        engagementReason: detail?.engagementReason ?? null,
      });
    } catch (failure) {
      outcomes.push({
        creator: name,
        handle: account.handle,
        status: "failed",
        detail: failure instanceof Error ? failure.message : String(failure),
      });
    }
  }

  // Report -------------------------------------------------------------------

  const ok = outcomes.filter((o) => o.status === "ok");
  const skipped = outcomes.filter((o) => o.status === "skipped");
  const failed = outcomes.filter((o) => o.status === "failed");

  const lines: string[] = [];
  lines.push("# Metric refresh report");
  lines.push("");
  lines.push(`- Platform: ${label}`);
  lines.push(`- Run at: ${new Date().toISOString()}`);
  lines.push(`- Mode: ${args.commit ? "committed" : "dry run, nothing written"}`);
  lines.push("");
  lines.push("| | |");
  lines.push("| --- | --- |");
  lines.push(`| Accounts tried | ${live.length} |`);
  lines.push(`| Fetched | ${ok.length} |`);
  lines.push(`| Could not resolve a channel | ${skipped.length} |`);
  lines.push(`| Errors | ${failed.length} |`);
  if (args.commit) {
    lines.push(`| Snapshots written | ${written} |`);
    lines.push(`| Handles backfilled from a video link | ${handlesBackfilled} |`);
  }
  lines.push("");

  lines.push("## Fetched");
  lines.push("");
  lines.push("| Creator | Channel | Subscribers | Avg views | Avg likes | Avg comments | Posts 30d | Sample |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const entry of ok) {
    const m = entry.metrics!;
    const cell = (value: number | null) => (value === null ? "No data" : formatCompact(value));
    lines.push(
      `| ${entry.creator} | ${entry.title ?? ""} | ${cell(m.followers)} | ` +
        `${cell(m.avgViews)} | ${cell(m.avgLikes)} | ${cell(m.avgComments)} | ` +
        `${m.postsLast30d === null ? "No data" : m.postsLast30d} | ${entry.detail} |`,
    );
  }
  lines.push("");

  if (skipped.length) {
    lines.push("## Could not resolve a channel");
    lines.push("");
    lines.push(
      "Nothing was recorded for these. They need a real channel URL on the " +
        "account before the API can find them.",
    );
    lines.push("");
    lines.push("| Creator | Handle | Why |");
    lines.push("| --- | --- | --- |");
    for (const entry of skipped) {
      lines.push(`| ${entry.creator} | ${entry.handle ?? "none"} | ${entry.detail} |`);
    }
    lines.push("");
  }

  if (failed.length) {
    lines.push("## Errors");
    lines.push("");
    for (const entry of failed) {
      lines.push(`- **${entry.creator}**: ${entry.detail}`);
    }
    lines.push("");
  }

  lines.push("## What YouTube does not provide");
  lines.push("");
  lines.push(
    "- **Average shares.** The API exposes no share metric, so it is left null " +
      "rather than guessed at. Engagement rate is computed from likes and " +
      "comments only, and the tooltip on each figure says so.",
  );
  lines.push(
    "- **Exact subscriber counts.** YouTube rounds publicly visible subscriber " +
      "counts to three significant figures. Treat them as approximate.",
  );
  lines.push(
    "- **Hidden metrics.** A channel that hides subscribers, or a video with " +
      "likes or comments turned off, yields null for that field. It is never " +
      "recorded as zero.",
  );
  lines.push("");

  mkdirSync(dirname(args.reportPath), { recursive: true });
  writeFileSync(args.reportPath, lines.join("\n"), "utf8");

  console.log(
    `${args.commit ? "Refreshed" : "Dry run"}: ${live.length} accounts, ` +
      `${ok.length} fetched, ${skipped.length} unresolved, ${failed.length} error(s).` +
      (args.commit
        ? ` ${written} snapshot(s) written, ${handlesBackfilled} handle(s) backfilled.`
        : ""),
  );
  console.log(`Report written to ${args.reportPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
