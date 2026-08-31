/**
 * Profile URL normalisation and handle extraction.
 *
 * The source spreadsheets mix genuine profile links with post permalinks that
 * happened to be pasted into a profile column. A post permalink has no handle
 * in it, and its last path segment is a post id, so extracting one would put
 * fabricated data in the handle column. Those rows resolve to a null handle
 * and are listed in the import report for a human to fix.
 */

import type { Platform } from "./types";

export type HandleExtraction = {
  /** Query parameters stripped, except those that carry identity. */
  url: string;
  handle: string | null;
  /** Present when no handle could be resolved. Goes into the import report. */
  unresolvedReason?: string;
  /**
   * True for facebook.com/profile.php?id=NNN, where the numeric id is all we
   * have. Such records must not be promoted past data_confidence 'unverified'
   * without someone checking the real profile.
   */
  numericProfileId?: boolean;
};

/**
 * Parameters that are part of the resource identity rather than tracking.
 * Everything else is dropped, which removes TikTok's
 * "?is_from_webapp=1&sender_device=pc" and YouTube's "?si=".
 */
const IDENTITY_PARAMS: Record<string, string[]> = {
  facebook: ["id"],
  youtube: ["v"],
  instagram: [],
  tiktok: [],
};

/** Facebook path segments that indicate a post or a system route, not a page. */
const FACEBOOK_NON_HANDLE = new Set([
  "share",
  "posts",
  "post",
  "videos",
  "video",
  "photo",
  "photos",
  "watch",
  "groups",
  "events",
  "reel",
  "story.php",
  "permalink.php",
  "media",
  "pages",
  "people",
]);

export function detectPlatform(url: string): Platform | null {
  const host = safeHost(url);
  if (!host) return null;
  if (host.includes("facebook.com") || host.includes("fb.com") || host.includes("fb.watch")) {
    return "facebook";
  }
  if (host.includes("instagram.com")) return "instagram";
  if (host.includes("tiktok.com")) return "tiktok";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
  return null;
}

function safeHost(url: string): string | null {
  try {
    return new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function cleanUrl(parsed: URL, platform: Platform): string {
  const keep = IDENTITY_PARAMS[platform] ?? [];
  const kept = new URLSearchParams();
  for (const name of keep) {
    const value = parsed.searchParams.get(name);
    if (value) kept.set(name, value);
  }
  const query = kept.toString();
  const path = parsed.pathname.replace(/\/+$/, "") || "/";
  return `${parsed.origin}${path}${query ? `?${query}` : ""}`;
}

function segments(parsed: URL): string[] {
  return parsed.pathname.split("/").filter(Boolean);
}

export function extractHandle(rawUrl: string, platform: Platform): HandleExtraction {
  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      url: trimmed,
      handle: null,
      unresolvedReason: `Not a parsable URL: ${JSON.stringify(rawUrl)}`,
    };
  }

  const url = cleanUrl(parsed, platform);
  const parts = segments(parsed);
  const atSegment = parts.find((part) => part.startsWith("@"));

  switch (platform) {
    case "tiktok": {
      if (atSegment) return { url, handle: atSegment.slice(1) };
      return {
        url,
        handle: null,
        unresolvedReason: "TikTok URL has no @handle segment.",
      };
    }

    case "youtube": {
      if (atSegment) return { url, handle: atSegment.slice(1) };
      // A channel id is a stable identifier even though it is not an @handle.
      const channelIndex = parts.indexOf("channel");
      if (channelIndex >= 0 && parts[channelIndex + 1]) {
        return { url, handle: parts[channelIndex + 1] };
      }
      for (const legacy of ["c", "user"]) {
        const index = parts.indexOf(legacy);
        if (index >= 0 && parts[index + 1]) {
          return { url, handle: parts[index + 1] };
        }
      }
      const host = parsed.hostname.toLowerCase();
      if (host.includes("youtu.be") || parts.includes("watch") || parts.includes("shorts")) {
        return {
          url,
          handle: null,
          unresolvedReason:
            "YouTube link points at a video, not a channel, so it carries no handle.",
        };
      }
      return {
        url,
        handle: null,
        unresolvedReason: "YouTube URL has no @handle, channel id or legacy user segment.",
      };
    }

    case "instagram": {
      const first = parts[0];
      if (!first || ["p", "reel", "reels", "tv", "stories", "explore"].includes(first)) {
        return {
          url,
          handle: null,
          unresolvedReason: "Instagram link points at a post rather than a profile.",
        };
      }
      return { url, handle: first.replace(/^@/, "") };
    }

    case "facebook": {
      if (parts[0] === "profile.php") {
        const id = parsed.searchParams.get("id");
        if (id && /^\d+$/.test(id)) {
          return { url, handle: id, numericProfileId: true };
        }
        return {
          url,
          handle: null,
          unresolvedReason: "facebook profile.php URL with no numeric id.",
        };
      }
      if (parts.length === 0 || FACEBOOK_NON_HANDLE.has(parts[0])) {
        return {
          url,
          handle: null,
          unresolvedReason:
            `Facebook link is a ${parts[0] ?? "root"} URL, which is a post or system ` +
            `route rather than a page, so its last segment is a post id and not a handle.`,
        };
      }
      return { url, handle: parts[0].replace(/^@/, "") };
    }
  }
}

/** Public profile URL for a resolved handle, used by the admin forms. */
export function profileUrlFor(platform: Platform, handle: string): string {
  switch (platform) {
    case "facebook":
      return /^\d+$/.test(handle)
        ? `https://www.facebook.com/profile.php?id=${handle}`
        : `https://www.facebook.com/${handle}`;
    case "instagram":
      return `https://www.instagram.com/${handle}`;
    case "tiktok":
      return `https://www.tiktok.com/@${handle}`;
    case "youtube":
      return handle.startsWith("UC")
        ? `https://www.youtube.com/channel/${handle}`
        : `https://www.youtube.com/@${handle}`;
  }
}
