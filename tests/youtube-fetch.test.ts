import { describe, expect, it } from "vitest";
import { YouTubeMetricSource } from "@/lib/metrics/sources/youtube";

/**
 * Exercises the whole request and response path with a stubbed fetch, so the
 * URLs the adapter builds and the shapes it reads are covered without a key
 * and without touching Google.
 */
function stubFetch(routes: Record<string, unknown>) {
  const calls: string[] = [];
  const impl = (async (url: string | URL) => {
    const href = String(url);
    calls.push(href);
    const match = Object.keys(routes).find((key) => href.includes(key));
    if (!match) {
      return { ok: false, status: 404, text: async () => "no stub for " + href } as Response;
    }
    return {
      ok: true,
      status: 200,
      json: async () => routes[match],
    } as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const account = {
  id: "acc-1",
  platform: "youtube" as const,
  handle: "MrMixersWorld",
  profileUrl: "https://www.youtube.com/@MrMixersWorld",
};

describe("YouTubeMetricSource.fetchMetrics", () => {
  it("resolves a handle, reads the channel, and averages recent uploads", async () => {
    const { impl, calls } = stubFetch({
      "channels?part=id": { items: [{ id: "UC123" }] },
      "channels?part=snippet%2Cstatistics%2CcontentDetails": {
        items: [
          {
            snippet: { title: "Mr. Mixer's World", customUrl: "@mrmixersworld" },
            statistics: { subscriberCount: "813000" },
            contentDetails: { relatedPlaylists: { uploads: "UU123" } },
          },
        ],
      },
      playlistItems: {
        items: [
          { contentDetails: { videoId: "v1" } },
          { contentDetails: { videoId: "v2" } },
        ],
      },
      "videos?part=statistics": {
        items: [
          {
            snippet: { publishedAt: "2026-08-30T00:00:00Z" },
            contentDetails: { duration: "PT10M" },
            statistics: { viewCount: "1000", likeCount: "100", commentCount: "10" },
          },
          {
            snippet: { publishedAt: "2020-01-01T00:00:00Z" },
            contentDetails: { duration: "PT30S" },
            statistics: { viewCount: "3000", likeCount: "300", commentCount: "30" },
          },
        ],
      },
    });

    const source = new YouTubeMetricSource("test-key", impl);
    const metrics = await source.fetchMetrics(account);

    expect(metrics).not.toBeNull();
    expect(metrics!.followers).toBe(813_000);
    expect(metrics!.avgViews).toBe(2000);
    expect(metrics!.avgLikes).toBe(200);
    expect(metrics!.avgComments).toBe(20);
    expect(metrics!.source).toBe("api");
    // YouTube exposes no share metric, so this must stay null forever.
    expect(metrics!.avgShares).toBeNull();

    expect(source.lastDetail?.channelId).toBe("UC123");
    expect(source.lastDetail?.resolvedHandle).toBe("mrmixersworld");
    expect(source.lastDetail?.summary.shorts).toBe(1);

    // The key must be on every request, and the handle must carry its @.
    expect(calls.every((call) => call.includes("key=test-key"))).toBe(true);
    expect(calls[0]).toContain("forHandle=%40MrMixersWorld");
  });

  it("resolves a channel from a bare video link when there is no handle", async () => {
    const { impl, calls } = stubFetch({
      "videos?part=snippet": { items: [{ snippet: { channelId: "UCfromVideo" } }] },
      "channels?part=snippet%2Cstatistics%2CcontentDetails": {
        items: [
          {
            snippet: { title: "Bd travellers", customUrl: "@bdtravellers" },
            statistics: { subscriberCount: "620000" },
            contentDetails: {},
          },
        ],
      },
    });

    const source = new YouTubeMetricSource("test-key", impl);
    const metrics = await source.fetchMetrics({
      ...account,
      handle: null,
      profileUrl: "https://youtu.be/dVbgv2tVyDQ",
    });

    expect(metrics!.followers).toBe(620_000);
    expect(source.lastDetail?.resolvedHandle).toBe("bdtravellers");
    expect(calls[0]).toContain("id=dVbgv2tVyDQ");
  });

  it("returns null with a reason when no channel can be found", async () => {
    const { impl } = stubFetch({ channels: { items: [] } });
    const source = new YouTubeMetricSource("test-key", impl);

    expect(await source.fetchMetrics(account)).toBeNull();
    expect(source.lastError).toMatch(/No channel found/);
  });

  it("reports a hidden subscriber count as null rather than zero", async () => {
    const { impl } = stubFetch({
      "channels?part=id": { items: [{ id: "UC123" }] },
      "channels?part=snippet%2Cstatistics%2CcontentDetails": {
        items: [
          {
            snippet: { title: "Quiet channel" },
            statistics: { subscriberCount: "0", hiddenSubscriberCount: true },
            contentDetails: {},
          },
        ],
      },
    });

    const source = new YouTubeMetricSource("test-key", impl);
    const metrics = await source.fetchMetrics(account);
    expect(metrics!.followers).toBeNull();
  });

  it("surfaces an API error rather than silently recording nothing", async () => {
    const impl = (async () =>
      ({
        ok: false,
        status: 403,
        text: async () => '{"error":{"message":"quotaExceeded"}}',
      }) as Response) as unknown as typeof fetch;

    const source = new YouTubeMetricSource("test-key", impl);
    await expect(source.fetchMetrics(account)).rejects.toThrow(
      /403[\s\S]*quotaExceeded/,
    );
  });

  it("ignores accounts that are not YouTube", async () => {
    const { impl } = stubFetch({});
    const source = new YouTubeMetricSource("test-key", impl);
    expect(
      await source.fetchMetrics({ ...account, platform: "tiktok" as never }),
    ).toBeNull();
  });
});
