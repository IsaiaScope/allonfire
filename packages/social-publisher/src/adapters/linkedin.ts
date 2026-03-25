import { formatErrorMessage } from "@allonfire/utils";
import { RestliClient } from "linkedin-api-client";
import type { DecryptedTokens, PublishRequest, PublishResult } from "../types";
import type { PlatformAdapter } from "./types";

function createRestliClient(): RestliClient {
  return new RestliClient();
}

async function getPersonId(accessToken: string): Promise<string> {
  const restliClient = createRestliClient();
  const response = await restliClient.get({
    resourcePath: "/userinfo",
    accessToken,
  });
  return (response.data as { sub: string }).sub;
}

async function uploadImage(
  imageBuffer: Buffer,
  imageMimeType: string,
  personId: string,
  accessToken: string
): Promise<string> {
  const restliClient = createRestliClient();

  const registerResponse = await restliClient.action({
    resourcePath: "/assets",
    actionName: "registerUpload",
    accessToken,
    data: {
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: `urn:li:person:${personId}`,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    },
  });

  const registerData = registerResponse.data as {
    value: {
      uploadMechanism: {
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
          uploadUrl: string;
        };
      };
      asset: string;
    };
  };

  const uploadUrl =
    registerData.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ].uploadUrl;
  const assetUrn = registerData.value.asset;

  // Binary upload still uses fetch — the SDK doesn't handle raw binary uploads
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": imageMimeType,
    },
    body: imageBuffer,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(
      `LinkedIn image upload failed (${uploadResponse.status}): ${errorText}`
    );
  }

  return assetUrn;
}

export function createLinkedInAdapter(): PlatformAdapter {
  return {
    async publish(
      request: PublishRequest,
      tokens: DecryptedTokens
    ): Promise<PublishResult> {
      try {
        const personId = await getPersonId(tokens.accessToken);

        const assetUrns: string[] = [];
        if (request.images && request.images.length > 0) {
          for (const img of request.images) {
            const urn = await uploadImage(
              img.buffer,
              img.mimeType,
              personId,
              tokens.accessToken
            );
            assetUrns.push(urn);
          }
        }

        const hasImages = assetUrns.length > 0;
        const restliClient = createRestliClient();

        const postResponse = await restliClient.create({
          resourcePath: "/ugcPosts",
          accessToken: tokens.accessToken,
          entity: {
            author: `urn:li:person:${personId}`,
            lifecycleState: "PUBLISHED",
            specificContent: {
              "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: request.content },
                shareMediaCategory: hasImages ? "IMAGE" : "NONE",
                media: assetUrns.map((urn) => ({
                  status: "READY",
                  media: urn,
                })),
              },
            },
            visibility: {
              "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
            },
          },
        });

        const postUrn =
          (postResponse.createdEntityId as string | undefined) ?? "unknown";

        return {
          success: true,
          platformPostId: postUrn,
          platformUrl: `https://www.linkedin.com/feed/update/${postUrn}`,
        };
      } catch (error) {
        return {
          success: false,
          error: formatErrorMessage(error, "Unknown LinkedIn publish error"),
        };
      }
    },

    async validateTokens(tokens: DecryptedTokens): Promise<boolean> {
      try {
        const restliClient = createRestliClient();
        await restliClient.get({
          resourcePath: "/userinfo",
          accessToken: tokens.accessToken,
        });
        return true;
      } catch {
        return false;
      }
    },
  };
}
