/**
 * YouTube Data API v3 metric source.
 *
 * The one platform in this dataset with a public API that works for accounts
 * the agency does not own. It reads subscriber count from the channel, and
 * averages views, likes and comments over the most recent uploads.
 *
 * What it deliberately does not do:
 *
 *  - It never returns zero for something the API withheld. A channel with
 *    hidden subscribers, likes turned off, or comments disabled yields null
 *    for that field, which the product renders as "No data".
 *  - It does not invent an average share count. YouTube exposes no share
 *    metric, so avgShares is always null and the engagement rate is computed
 *    from likes and comments alone, which the metric layer already reports.
 *
 * Quota is roughly four units per account against a default of 10,000 a day,
 * so a full refresh of this database costs about one percent of the daily
 * allowance.
 */

import type {
  FetchedMetrics,
  MetricSource,
  MetricSourceAccount,
} from "../source";

const API = "https://www.googleapis.com/youtube/v3";

/** How many recent uploads the averages are taken over. */
export const SAMPLE_SIZE = 25;
/** Uploads at or under this many seconds are counted as Shorts. */
export const SHORTS_MAX_SECONDS = 60;

export type ChannelLookup =
  | { kind: "id"; value: string }
  | { kind: "handle"; value: string }
  | { kind: "username"; value: string }
  | { kind: "video"; value: string };

/**
 * Works out how to ask the API for a channel.
 *
 * Handles arrive in several shapes: an @handle, a raw UC channel id, a legacy
 * /c/ or /user/ name, or nothing at all when the sheet only ever held a link
 * to one of the creator's videos. That last case is still resolvable, because
 * a video knows which channel it belongs to.
 */
export function channelLookupFor(
  handle: string | null,
  profileUrl: string,
): ChannelLookup | null {
  if (handle) {
    if (/^UC[\w-]{22}$/.test(handle)) return { kind: "id", value: handle };
    // A legacy /c/ or /user/ path is not an @handle and has to be tried as a
    // username; the caller falls back between the two.
    if (/^\/c\/|\/user\//.test(new URL(profileUrl).pathname)) {
      return { kind: "username", value: handle };
    }
    return { kind: "handle", value: handle };
  }

  try {
    const url = new URL(profileUrl);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (id) return { kind: "video", value: id };
    }
    const v = url.searchParams.get("v");
    if (v) return { kind: "video", value: v };
    const parts = url.pathname.split("/").filter(Boolean);
    const shortsIndex = parts.indexOf("shorts");
    if (shortsIndex >= 0 && parts[shortsIndex + 1]) {
      return { kind: "video", value: parts[shortsIndex + 1] };
    }
  } catch {
    return null;
  }
  return null;
}

/** Seconds from an ISO 8601 duration such as PT1M30S. */
export function durationToSeconds(duration: string | undefined): number | null {
  if (!duration) return null;
  const match = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(duration);
  if (!match) return null;
  const [, days, hours, minutes, seconds] = match;
  return (
    Number(days ?? 0) * 86400 +
    Number(hours ?? 0) * 3600 +
    Number(minutes ?? 0) * 60 +
    Number(seconds ?? 0)
  );
}

export type VideoStat = {
  publishedAt: string;
  durationSeconds: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
};

export type VideoSummary = {
  avgViews: number | null;
  avgLikes: number | null;
  avgComments: number | null;
  postsLast30d: number | null;
  sampled: number;
  shorts: number;
  longForm: number;
};

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Averages a sample of uploads.
 *
 * Each metric averages only over the videos that actually reported it. A
 * channel that hides likes on half its videos gets an average of the half that
 * showed them, not an average dragged toward zero by the half that did not.
 */
export function summariseVideos(videos: VideoStat[], today: Date): VideoSummary {
  const shorts = videos.filter(
    (video) =>
      video.durationSeconds !== null && video.durationSeconds <= SHORTS_MAX_SECONDS,
  ).length;

  const cutoff = new Date(today.getTime() - 30 * 86_400_000);

  return {
    avgViews: mean(videos.map((v) => v.views).filter((v): v is number => v !== null)),
    avgLikes: mean(videos.map((v) => v.likes).filter((v): v is number => v !== null)),
    avgComments: mean(
      videos.map((v) => v.comments).filter((v): v is number => v !== null),
    ),
    // Only meaningful if the sample reaches back past the window; a channel
    // that posted more than SAMPLE_SIZE videos in 30 days would be undercounted.
    postsLast30d: videos.some((v) => new Date(v.publishedAt) < cutoff)
      ? videos.filter((v) => new Date(v.publishedAt) >= cutoff).length
      : null,
    sampled: videos.length,
    shorts,
    longForm: videos.length - shorts,
  };
}

/** Subscriber count, or null when the channel hides it. */
export function readSubscribers(statistics: {
  subscriberCount?: string;
  hiddenSubscriberCount?: boolean;
}): number | null {
  if (statistics.hiddenSubscriberCount) return null;
  if (statistics.subscriberCount === undefined) return null;
  const parsed = Number(statistics.subscriberCount);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalCount(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export type YouTubeFetchDetail = {
  channelId: string;
  channelTitle: string;
  resolvedHandle: string | null;
  summary: VideoSummary;
  subscribersHidden: boolean;
};

export class YouTubeMetricSource implements MetricSource {
  readonly key = "youtube_data_api";
  readonly label = "YouTube Data API";

  /** Populated on the last fetch, for the refresh report. */
  lastDetail: YouTubeFetchDetail | null = null;
  lastError: string | null = null;

  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async get(path: string, params: Record<string, string>) {
    const query = new URLSearchParams({ ...params, key: this.apiKey });
    const response = await this.fetchImpl(`${API}/${path}?${query}`);
    if (!response.ok) {
      const body = await response.text();
      // Quota exhaustion and a bad key both arrive as 403; the message is the
      // only way to tell them apart, so it is surfaced rather than swallowed.
      throw new Error(
        `YouTube ${path} returned ${response.status}: ${body.slice(0, 300)}`,
      );
    }
    return (await response.json()) as {
      items?: Record<string, never>[];
    };
  }

  private async resolveChannelId(lookup: ChannelLookup): Promise<string | null> {
    if (lookup.kind === "id") return lookup.value;

    if (lookup.kind === "video") {
      const result = await this.get("videos", { part: "snippet", id: lookup.value });
      const snippet = (result.items?.[0] as { snippet?: { channelId?: string } })?.snippet;
      return snippet?.channelId ?? null;
    }

    // A name from a /c/ path is usually also the @handle, and an @handle is
    // occasionally only a legacy username, so both forms are tried either way.
    // The likelier one for this lookup kind goes first; each costs one unit.
    const attempts: Record<string, string>[] =
      lookup.kind === "username"
        ? [{ forUsername: lookup.value }, { forHandle: `@${lookup.value}` }]
        : [{ forHandle: `@${lookup.value}` }, { forUsername: lookup.value }];

    for (const params of attempts) {
      const result = await this.get("channels", { part: "id", ...params });
      const id = (result.items?.[0] as { id?: string })?.id;
      if (id) return id;
    }

    return null;
  }

  async fetchMetrics(account: MetricSourceAccount): Promise<FetchedMetrics | null> {
    this.lastDetail = null;
    this.lastError = null;

    if (account.platform !== "youtube") return null;

    const lookup = channelLookupFor(account.handle, account.profileUrl);
    if (!lookup) {
      this.lastError = "No handle, channel id or video link to resolve a channel from.";
      return null;
    }

    const channelId = await this.resolveChannelId(lookup);
    if (!channelId) {
      this.lastError = `No channel found for ${lookup.kind} "${lookup.value}".`;
      return null;
    }

    const channelResult = await this.get("channels", {
      part: "snippet,statistics,contentDetails",
      id: channelId,
    });
    const channel = channelResult.items?.[0] as
      | {
          snippet?: { title?: string; customUrl?: string };
          statistics?: { subscriberCount?: string; hiddenSubscriberCount?: boolean };
          contentDetails?: { relatedPlaylists?: { uploads?: string } };
        }
      | undefined;

    if (!channel) {
      this.lastError = `Channel ${channelId} returned no data.`;
      return null;
    }

    const uploads = channel.contentDetails?.relatedPlaylists?.uploads;
    let videos: VideoStat[] = [];

    if (uploads) {
      const playlist = await this.get("playlistItems", {
        part: "contentDetails",
        playlistId: uploads,
        maxResults: String(SAMPLE_SIZE),
      });
      const ids = (playlist.items ?? [])
        .map((item) => (item as { contentDetails?: { videoId?: string } }).contentDetails?.videoId)
        .filter((id): id is string => Boolean(id));

      if (ids.length) {
        const detail = await this.get("videos", {
          part: "statistics,snippet,contentDetails",
          id: ids.join(","),
        });
        videos = (detail.items ?? []).map((item) => {
          const video = item as unknown as {
            snippet?: { publishedAt?: string };
            contentDetails?: { duration?: string };
            statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
          };
          return {
            publishedAt: video.snippet?.publishedAt ?? new Date().toISOString(),
            durationSeconds: durationToSeconds(video.contentDetails?.duration),
            views: optionalCount(video.statistics?.viewCount),
            likes: optionalCount(video.statistics?.likeCount),
            comments: optionalCount(video.statistics?.commentCount),
          };
        });
      }
    }

    const summary = summariseVideos(videos, new Date());

    this.lastDetail = {
      channelId,
      channelTitle: channel.snippet?.title ?? channelId,
      resolvedHandle: channel.snippet?.customUrl?.replace(/^@/, "") ?? null,
      summary,
      subscribersHidden: Boolean(channel.statistics?.hiddenSubscriberCount),
    };

    return {
      capturedOn: new Date().toISOString().slice(0, 10),
      followers: readSubscribers(channel.statistics ?? {}),
      avgViews: summary.avgViews,
      avgLikes: summary.avgLikes,
      avgComments: summary.avgComments,
      // YouTube exposes no share metric. Left null rather than guessed.
      avgShares: null,
      postsLast30d: summary.postsLast30d,
      source: "api",
    };
  }
}
