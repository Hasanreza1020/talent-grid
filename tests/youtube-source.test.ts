import { describe, expect, it } from "vitest";
import {
  channelLookupFor,
  durationToSeconds,
  readSubscribers,
  summariseVideos,
  SHORTS_MAX_SECONDS,
  type VideoStat,
} from "@/lib/metrics/sources/youtube";

describe("channelLookupFor", () => {
  it("recognises a raw channel id", () => {
    expect(channelLookupFor("UCabcdefghijklmnopqrstuv", "https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv"))
      .toEqual({ kind: "id", value: "UCabcdefghijklmnopqrstuv" });
  });

  it("treats an ordinary handle as an @handle", () => {
    expect(channelLookupFor("MrMixersWorld", "https://www.youtube.com/@MrMixersWorld"))
      .toEqual({ kind: "handle", value: "MrMixersWorld" });
  });

  it("treats a legacy /c/ path as a username", () => {
    // AroundMeBD is stored from a /c/ URL and is not an @handle.
    expect(channelLookupFor("AroundMeBD", "https://www.youtube.com/c/AroundMeBD"))
      .toEqual({ kind: "username", value: "AroundMeBD" });
  });

  it("resolves a channel through a video when there is no handle at all", () => {
    // These are the six accounts the sheet gave as bare video links.
    expect(channelLookupFor(null, "https://youtu.be/dVbgv2tVyDQ"))
      .toEqual({ kind: "video", value: "dVbgv2tVyDQ" });
    expect(channelLookupFor(null, "https://www.youtube.com/watch?v=kOrCwGOCCRc"))
      .toEqual({ kind: "video", value: "kOrCwGOCCRc" });
    expect(channelLookupFor(null, "https://www.youtube.com/shorts/abc123"))
      .toEqual({ kind: "video", value: "abc123" });
  });

  it("gives up rather than guessing when there is nothing to go on", () => {
    expect(channelLookupFor(null, "https://www.youtube.com/")).toBeNull();
    expect(channelLookupFor(null, "not a url")).toBeNull();
  });
});

describe("durationToSeconds", () => {
  it("parses the ISO 8601 durations the API returns", () => {
    expect(durationToSeconds("PT59S")).toBe(59);
    expect(durationToSeconds("PT1M30S")).toBe(90);
    expect(durationToSeconds("PT1H2M3S")).toBe(3723);
    expect(durationToSeconds("P1DT2H")).toBe(93600);
  });

  it("returns null for a missing or unparsable duration", () => {
    expect(durationToSeconds(undefined)).toBeNull();
    expect(durationToSeconds("live")).toBeNull();
  });
});

describe("readSubscribers", () => {
  it("reads a visible count", () => {
    expect(readSubscribers({ subscriberCount: "813000" })).toBe(813_000);
  });

  it("returns null when the channel hides subscribers, never zero", () => {
    expect(readSubscribers({ subscriberCount: "0", hiddenSubscriberCount: true })).toBeNull();
    expect(readSubscribers({})).toBeNull();
  });
});

describe("summariseVideos", () => {
  const today = new Date("2026-09-01T00:00:00Z");
  const video = (over: Partial<VideoStat> = {}): VideoStat => ({
    publishedAt: "2026-08-25T00:00:00Z",
    durationSeconds: 300,
    views: 1000,
    likes: 100,
    comments: 10,
    ...over,
  });

  it("averages each metric over the videos that actually reported it", () => {
    const summary = summariseVideos(
      [video({ views: 1000 }), video({ views: 3000 }), video({ views: 2000 })],
      today,
    );
    expect(summary.avgViews).toBe(2000);
  });

  it("does not let a hidden like count drag the average toward zero", () => {
    // The second video has likes turned off. The average must be of the two
    // that reported, not of three with a zero in the middle.
    const summary = summariseVideos(
      [video({ likes: 100 }), video({ likes: null }), video({ likes: 200 })],
      today,
    );
    expect(summary.avgLikes).toBe(150);
  });

  it("returns null when no video reported a metric", () => {
    const summary = summariseVideos([video({ likes: null }), video({ likes: null })], today);
    expect(summary.avgLikes).toBeNull();
  });

  it("returns nulls rather than zeros for an empty sample", () => {
    const summary = summariseVideos([], today);
    expect(summary.avgViews).toBeNull();
    expect(summary.avgLikes).toBeNull();
    expect(summary.avgComments).toBeNull();
    expect(summary.postsLast30d).toBeNull();
  });

  it("counts Shorts separately from long form", () => {
    const summary = summariseVideos(
      [
        video({ durationSeconds: 30 }),
        video({ durationSeconds: SHORTS_MAX_SECONDS }),
        video({ durationSeconds: 600 }),
      ],
      today,
    );
    expect(summary.shorts).toBe(2);
    expect(summary.longForm).toBe(1);
  });

  it("counts posts in the last 30 days", () => {
    const summary = summariseVideos(
      [
        video({ publishedAt: "2026-08-30T00:00:00Z" }),
        video({ publishedAt: "2026-08-20T00:00:00Z" }),
        video({ publishedAt: "2026-05-01T00:00:00Z" }),
      ],
      today,
    );
    expect(summary.postsLast30d).toBe(2);
  });

  it("refuses to report posts in 30 days when the sample never reaches back that far", () => {
    // Every sampled upload is inside the window, so the real count could be
    // higher than the sample size. Reporting the sample would understate it.
    const summary = summariseVideos(
      [
        video({ publishedAt: "2026-08-30T00:00:00Z" }),
        video({ publishedAt: "2026-08-29T00:00:00Z" }),
      ],
      today,
    );
    expect(summary.postsLast30d).toBeNull();
  });
});
