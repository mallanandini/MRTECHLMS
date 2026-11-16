/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Utility for parsing and normalizing YouTube and external video URLs for LMS playback.
 * Configured specifically to ensure YouTube embedded players receive proper Referer/origin
 * identity and prevent YouTube Error 153.
 */

export interface YouTubeEmbedOptions {
  startTime?: number;
  autoplay?: boolean;
  enableJsApi?: boolean;
  origin?: string;
  rel?: 0 | 1;
  modestbranding?: 0 | 1;
  playsinline?: 0 | 1;
}

export interface YouTubeVideoInfo {
  isValid: boolean;
  videoId: string | null;
  embedUrl: string | null;
  startTime?: number;
  error?: string;
}

/**
 * Valid YouTube video IDs are exactly 11 characters containing letters, numbers, underscores, or hyphens.
 */
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Builds a compliant YouTube embed URL with proper query parameters and dynamic origin.
 * Avoids YouTube player configuration error 153 by maintaining clean embed parameters
 * and strictly binding JS API origin when enabled without hardcoding localhost.
 */
export function buildYouTubeEmbedUrl(videoId: string, options: YouTubeEmbedOptions = {}): string {
  if (!videoId || !YOUTUBE_ID_REGEX.test(videoId)) {
    return "";
  }

  const {
    startTime,
    autoplay = false,
    enableJsApi = false,
    origin,
    rel = 0,
    modestbranding = 1,
    playsinline = 1
  } = options;

  const params = new URLSearchParams();
  params.set("rel", String(rel));
  params.set("modestbranding", String(modestbranding));
  params.set("playsinline", String(playsinline));

  if (autoplay) {
    params.set("autoplay", "1");
  }

  if (startTime && startTime > 0) {
    params.set("start", String(Math.floor(startTime)));
  }

  if (enableJsApi) {
    params.set("enablejsapi", "1");
    // Dynamically retrieve client origin if available; never hardcode localhost
    const effectiveOrigin = origin || (typeof window !== "undefined" && window.location?.origin ? window.location.origin : "");
    if (effectiveOrigin) {
      params.set("origin", effectiveOrigin);
    }
  }

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

/**
 * Parses timestamp string (e.g., "1h20m15s", "90s", "120") into total seconds.
 */
function parseStartTime(timeParam: string | null): number {
  if (!timeParam) return 0;
  const str = timeParam.trim();
  if (!str) return 0;

  // Format: 1h2m3s or combinations
  const hMatch = str.match(/(\d+)\s*h/i);
  const mMatch = str.match(/(\d+)\s*m/i);
  const sMatch = str.match(/(\d+)\s*s/i);

  if (hMatch || mMatch || sMatch) {
    let total = 0;
    if (hMatch) total += parseInt(hMatch[1], 10) * 3600;
    if (mMatch) total += parseInt(mMatch[1], 10) * 60;
    if (sMatch) total += parseInt(sMatch[1], 10);
    return total;
  }

  // Pure integer seconds
  const numeric = parseInt(str, 10);
  return !isNaN(numeric) && numeric > 0 ? numeric : 0;
}

/**
 * Extracts the 11-character video ID from any valid YouTube URL format.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://m.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 * - URLs with tracking parameters (?si=..., &feature=..., etc.)
 * - URLs with timestamp parameters (?t=... or ?start=...)
 * - Direct 11-character video ID
 */
export function parseYouTubeVideo(rawUrl?: string | null, options: YouTubeEmbedOptions = {}): YouTubeVideoInfo {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, videoId: null, embedUrl: null, error: "No URL provided" };
  }

  const url = rawUrl.trim();
  if (!url) {
    return { isValid: false, videoId: null, embedUrl: null, error: "Empty URL provided" };
  }

  // 1. Direct 11-character video ID
  if (YOUTUBE_ID_REGEX.test(url)) {
    return {
      isValid: true,
      videoId: url,
      embedUrl: buildYouTubeEmbedUrl(url, options),
      startTime: options.startTime
    };
  }

  try {
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const parsed = new URL(normalizedUrl);
    const host = parsed.hostname.toLowerCase();

    const isYouTubeHost =
      host === "youtube.com" ||
      host.endsWith(".youtube.com") ||
      host === "youtu.be" ||
      host === "youtube-nocookie.com" ||
      host.endsWith(".youtube-nocookie.com");

    if (isYouTubeHost) {
      let videoId: string | null = null;
      let startSeconds = parseStartTime(parsed.searchParams.get("t") || parsed.searchParams.get("start"));

      // A. youtu.be/<id>
      if (host === "youtu.be") {
        const segments = parsed.pathname.split("/").filter(Boolean);
        if (segments.length > 0 && YOUTUBE_ID_REGEX.test(segments[0])) {
          videoId = segments[0];
        }
      }

      // B. youtube.com/watch?v=<id>
      if (!videoId && parsed.searchParams.has("v")) {
        const v = parsed.searchParams.get("v");
        if (v && YOUTUBE_ID_REGEX.test(v)) {
          videoId = v;
        }
      }

      // C. /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
      if (!videoId) {
        const segments = parsed.pathname.split("/").filter(Boolean);
        const prefixIdx = segments.findIndex(seg =>
          ["embed", "shorts", "live", "v"].includes(seg.toLowerCase())
        );
        if (prefixIdx !== -1 && segments.length > prefixIdx + 1) {
          const candidate = segments[prefixIdx + 1];
          if (YOUTUBE_ID_REGEX.test(candidate)) {
            videoId = candidate;
          }
        }
      }

      if (videoId) {
        const effectiveStart = options.startTime !== undefined ? options.startTime : (startSeconds > 0 ? startSeconds : undefined);
        return {
          isValid: true,
          videoId,
          embedUrl: buildYouTubeEmbedUrl(videoId, { ...options, startTime: effectiveStart }),
          startTime: effectiveStart
        };
      }
    }
  } catch {
    // URL parsing threw, attempt fallback regex
  }

  // 2. Regex fallback for non-standard or malformed URLs
  const fallbackMatch = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([\w-]{11})/i
  );
  if (fallbackMatch && fallbackMatch[1]) {
    const videoId = fallbackMatch[1];
    return {
      isValid: true,
      videoId,
      embedUrl: buildYouTubeEmbedUrl(videoId, options),
      startTime: options.startTime
    };
  }

  return {
    isValid: false,
    videoId: null,
    embedUrl: null,
    error: "The provided URL is not a recognized YouTube video format."
  };
}

export interface VideoEmbedResult {
  type: "youtube" | "vimeo" | "native" | "invalid";
  videoId?: string;
  embedUrl?: string;
  videoUrl?: string;
  startTime?: number;
  error?: string;
}

/**
 * Universal video classifier for LMS playback.
 */
export function getEmbedVideo(url?: string, options: YouTubeEmbedOptions = {}): VideoEmbedResult | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Check for YouTube
  const ytInfo = parseYouTubeVideo(trimmed, options);
  if (ytInfo.isValid && ytInfo.embedUrl) {
    return {
      type: "youtube",
      videoId: ytInfo.videoId || undefined,
      embedUrl: ytInfo.embedUrl,
      startTime: ytInfo.startTime
    };
  }

  // 2. Check for Vimeo
  const vimeoMatch = trimmed.match(
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|video\/|)(\d+)/i
  );
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: "vimeo",
      videoId: vimeoMatch[1],
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}`
    };
  }

  // 3. Direct video format or relative assets/storage path
  const isDirectVideo =
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(trimmed) ||
    trimmed.startsWith("/assets/videos/") ||
    trimmed.startsWith("/assets/documents/") ||
    trimmed.startsWith("/assets/other/") ||
    trimmed.startsWith("/storage/videos/") ||
    trimmed.startsWith("/storage/materials/");

  if (isDirectVideo || /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return {
      type: "native",
      videoUrl: trimmed
    };
  }

  return {
    type: "invalid",
    error: "Unrecognized video URL or format"
  };
}
