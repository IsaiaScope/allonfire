import type { DecryptedTokens, PublishRequest, PublishResult } from "../types";
import type { PlatformAdapter } from "./types";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/**
 * YouTube community posts are not available via the standard YouTube Data API.
 * The YouTube Data API supports video uploads and channel management, but community
 * posts require either the YouTube Studio internal API or specific partner access.
 *
 * This adapter validates tokens against the YouTube Data API and returns a descriptive
 * error for publish attempts, since programmatic community post creation is not
 * supported by the public API.
 */
export function createYouTubeAdapter(): PlatformAdapter {
  return {
    publish(
      _request: PublishRequest,
      _tokens: DecryptedTokens
    ): Promise<PublishResult> {
      return Promise.resolve({
        success: false,
        error:
          "Community posts not supported via API. Post manually in YouTube Studio.",
      });
    },

    async validateTokens(tokens: DecryptedTokens): Promise<boolean> {
      try {
        const response = await fetch(
          `${YOUTUBE_API_BASE}/channels?part=snippet&mine=true`,
          {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          return false;
        }

        const data = (await response.json()) as {
          items?: unknown[];
        };

        return Array.isArray(data.items) && data.items.length > 0;
      } catch {
        return false;
      }
    },
  };
}
