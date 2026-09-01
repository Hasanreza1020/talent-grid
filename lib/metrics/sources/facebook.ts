/**
 * Facebook Graph API metric source.
 *
 * Reading another organisation's Page is not the same job as reading your own.
 * Two things follow from that, and both shape this file:
 *
 *   1. Follower counts on a Page you do not administer require the app to hold
 *      Page Public Content Access, granted through App Review plus Business
 *      Verification. Without it the call fails with a permissions error rather
 *      than returning a smaller answer.
 *   2. Post-level engagement is a second, separate permission surface. It is
 *      requested independently here so that a token which can read followers
 *      but not posts still yields followers, with the reason engagement is
 *      missing recorded rather than silently dropped.
 *
 * Facebook exposes no view count for a Page's posts without Page Insights,
 * which is owner-only, so avgViews is always null. That is not a gap in this
 * adapter: the engagement rate formula already falls back to a follower-based
 * figure and labels it as not comparable.
 */

import type {
  FetchDetail,
  FetchedMetrics,
  MetricSource,
  MetricSourceAccount,
} from "../source";

const GRAPH_HOST = "https://graph.facebook.com";
/** Posts pulled to average engagement over. */
const POST_SAMPLE = 25;

type GraphError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
};

/**
 * Turns a Graph error into something a person reading the report can act on.
 * The codes matter: an expired token and a missing review permission look
 * identical in the raw message but need completely different fixes.
 */
function explainGraphError(error: GraphError, context: string): string {
  const code = error.code;
  const raw = error.message ?? "unknown error";

  if (code === 190) {
    return (
      `The access token is invalid or has expired (${context}). Generate a new ` +
      `long-lived token and update FACEBOOK_ACCESS_TOKEN.`
    );
  }
  if (code === 10 || code === 200 || code === 299) {
    return (
      `The app is not permitted to read this (${context}). Reading Pages you do ` +
      `not administer needs Page Public Content Access, which is granted through ` +
      `App Review and Business Verification. Graph said: ${raw}`
    );
  }
  if (code === 4 || code === 17 || code === 32 || code === 613) {
    return `Rate limited by Graph (${context}). Wait and re-run. Graph said: ${raw}`;
  }
  if (code === 803 || (code === 100 && /does not exist|Unsupported get request/i.test(raw))) {
    return (
      `No readable Page at this identifier (${context}). Personal profiles cannot ` +
      `be read through the Graph API at all, and several of these ids are personal ` +
      `profiles rather than Pages. Graph said: ${raw}`
    );
  }
  return `${context}: ${raw}`;
}

export class FacebookMetricSource implements MetricSource {
  readonly key = "facebook_graph_api";
  readonly label = "Facebook Graph API";

  lastDetail: FetchDetail | null = null;
  lastError: string | null = null;

  /**
   * `apiVersion` is optional on purpose. Graph versions expire on a schedule,
   * and pinning one that has lapsed fails every call. Left unset, the request
   * goes unversioned and Meta applies the app's own default version, which is
   * the setting the account owner controls.
   */
  constructor(
    private readonly accessToken: string,
    private readonly apiVersion?: string,
  ) {}

  private url(path: string, params: Record<string, string>): string {
    const base = this.apiVersion
      ? `${GRAPH_HOST}/${this.apiVersion}/${path}`
      : `${GRAPH_HOST}/${path}`;
    const search = new URLSearchParams({ ...params, access_token: this.accessToken });
    return `${base}?${search.toString()}`;
  }

  private async get(
    path: string,
    params: Record<string, string>,
    context: string,
  ): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; reason: string }> {
    const response = await fetch(this.url(path, params));
    const text = await response.text();

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      return {
        ok: false,
        reason: `${context}: Graph returned a non-JSON response (HTTP ${response.status}).`,
      };
    }

    if (body.error) {
      return { ok: false, reason: explainGraphError(body.error as GraphError, context) };
    }
    if (!response.ok) {
      return { ok: false, reason: `${context}: HTTP ${response.status}.` };
    }
    return { ok: true, body };
  }

  /**
   * The node to query. A numeric id is used directly; a vanity name resolves as
   * a node in its own right. A share permalink carries no identifier at all,
   * which is why the importer refused to invent a handle from one.
   */
  private nodeFor(account: MetricSourceAccount): string | null {
    if (account.handle) return account.handle;
    return null;
  }

  async fetchMetrics(account: MetricSourceAccount): Promise<FetchedMetrics | null> {
    this.lastDetail = null;
    this.lastError = null;

    const node = this.nodeFor(account);
    if (!node) {
      this.lastError =
        "No handle on the account. This row holds a share permalink, which carries " +
        "no page identifier, so there is nothing to look up.";
      return null;
    }

    const page = await this.get(
      node,
      { fields: "id,name,username,followers_count,fan_count" },
      `reading page "${node}"`,
    );

    if (!page.ok) {
      this.lastError = page.reason;
      return null;
    }

    const followersRaw = page.body.followers_count ?? page.body.fan_count;
    const followers =
      typeof followersRaw === "number" && Number.isFinite(followersRaw)
        ? followersRaw
        : null;

    // Engagement is a separate permission surface. A refusal here is recorded
    // and the follower count is still returned.
    const posts = await this.get(
      `${String(page.body.id ?? node)}/posts`,
      {
        fields: "created_time,reactions.summary(total_count),comments.summary(total_count),shares",
        limit: String(POST_SAMPLE),
      },
      `reading posts for "${node}"`,
    );

    let avgLikes: number | null = null;
    let avgComments: number | null = null;
    let avgShares: number | null = null;
    let postsLast30d: number | null = null;
    let engagementReason: string | null = null;
    let sampled = 0;
    let withinWindow = 0;

    if (!posts.ok) {
      engagementReason = posts.reason;
    } else {
      const items = Array.isArray(posts.body.data)
        ? (posts.body.data as Record<string, unknown>[])
        : [];
      sampled = items.length;

      if (items.length === 0) {
        engagementReason = "The page returned no readable posts.";
      } else {
        const reactions: number[] = [];
        const comments: number[] = [];
        const shares: number[] = [];
        const cutoff = Date.now() - 30 * 86_400_000;

        for (const item of items) {
          const reactionTotal = summaryTotal(item.reactions);
          const commentTotal = summaryTotal(item.comments);
          const shareTotal =
            typeof (item.shares as { count?: number } | undefined)?.count === "number"
              ? (item.shares as { count: number }).count
              : null;

          if (reactionTotal !== null) reactions.push(reactionTotal);
          if (commentTotal !== null) comments.push(commentTotal);
          if (shareTotal !== null) shares.push(shareTotal);

          const created = typeof item.created_time === "string" ? Date.parse(item.created_time) : NaN;
          if (Number.isFinite(created) && created >= cutoff) withinWindow += 1;
        }

        avgLikes = mean(reactions);
        avgComments = mean(comments);
        avgShares = mean(shares);

        // Only a count that the sample could actually have exceeded is
        // trustworthy. If every post pulled falls inside the window, the real
        // figure may be higher, so it is left null rather than understated.
        postsLast30d = withinWindow < items.length ? withinWindow : null;
      }
    }

    this.lastDetail = {
      title: typeof page.body.name === "string" ? page.body.name : node,
      resolvedHandle:
        typeof page.body.username === "string" && page.body.username.length > 0
          ? page.body.username
          : null,
      engagementReason,
      summaryLine: engagementReason
        ? `Followers only; engagement unavailable`
        : `${sampled} recent post(s) sampled, ${withinWindow} inside 30 days`,
    };

    return {
      capturedOn: new Date().toISOString().slice(0, 10),
      followers,
      // Facebook exposes no view count for a page you do not own; Page Insights
      // is owner-only. Null, never zero.
      avgViews: null,
      avgLikes,
      avgComments,
      avgShares,
      postsLast30d,
      source: "api",
    };
  }
}

function summaryTotal(value: unknown): number | null {
  const total = (value as { summary?: { total_count?: unknown } } | undefined)?.summary
    ?.total_count;
  return typeof total === "number" && Number.isFinite(total) ? total : null;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
