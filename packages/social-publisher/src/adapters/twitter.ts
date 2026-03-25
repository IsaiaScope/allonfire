import { formatErrorMessage } from "@allonfire/utils";
import { TwitterApi } from "twitter-api-v2";
import type { DecryptedTokens, PublishRequest, PublishResult } from "../types";
import type { PlatformAdapter } from "./types";

function createClient(accessToken: string): TwitterApi {
  return new TwitterApi(accessToken);
}

export function createTwitterAdapter(): PlatformAdapter {
  return {
    async publish(
      request: PublishRequest,
      tokens: DecryptedTokens
    ): Promise<PublishResult> {
      try {
        const client = createClient(tokens.accessToken);

        // Image upload requires Basic tier ($100/mo) or higher — v1 media upload API
        // Uncomment when upgrading from pay-per-use to a plan with v1 access:
        //
        // const mediaIds: string[] = [];
        // if (request.images && request.images.length > 0) {
        //   for (const img of request.images.slice(0, 4)) {
        //     const mediaId = await client.v1.uploadMedia(img.buffer, {
        //       mimeType: img.mimeType,
        //       target: "tweet",
        //     });
        //     mediaIds.push(mediaId);
        //   }
        // }
        // const tweetPayload: Parameters<typeof client.v2.tweet>[0] = {
        //   text: request.content,
        //   ...(mediaIds.length > 0 && {
        //     media: { media_ids: mediaIds as unknown as [string] },
        //   }),
        // };
        // const result = await client.v2.tweet(tweetPayload);

        const result = await client.v2.tweet({ text: request.content });
        const tweetId = result.data.id;

        return {
          success: true,
          platformPostId: tweetId,
          platformUrl: `https://twitter.com/i/web/status/${tweetId}`,
        };
      } catch (error) {
        return {
          success: false,
          error: formatErrorMessage(error, "Unknown Twitter publish error"),
        };
      }
    },

    async validateTokens(tokens: DecryptedTokens): Promise<boolean> {
      try {
        const client = createClient(tokens.accessToken);
        await client.v2.me();
        return true;
      } catch {
        return false;
      }
    },
  };
}
