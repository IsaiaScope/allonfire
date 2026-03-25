"use server";

import { getActiveProviderClient } from "@allonfire/content-generator";
import { getPlatformRules } from "@allonfire/content-generator/platforms/index";
import { getSocialAccount, type Platform, prisma } from "@allonfire/database";
import { getAdapter, resizeAllForPlatform } from "@allonfire/social-publisher";
import { objectKeys } from "@allonfire/utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { requireAuth } from "@/lib/server-auth";
import { platformEnum } from "../constants/platforms";
import type { PublishResultItem } from "../types/publish-types";

export async function elaborateAction(
  content: string
): Promise<ActionResult<{ content: string }>> {
  await requireAuth();

  const validated = z.string().min(1).max(10_000).parse(content);

  try {
    const { client, model } = await getActiveProviderClient();

    const response = await client.generate({
      model,
      maxTokens: 1024,
      system:
        "You are a social media expert. Enhance the following text to be more engaging, punchy, and shareable. Rules:\n- Keep the core message intact\n- Stay within the same approximate length as the input (do not add new sections or formats)\n- Do NOT invent content that isn't in the original (no fake video scripts, timestamps, or references to content that doesn't exist)\n- Do NOT add platform-specific formatting (hashtags, CTAs, etc.) — that happens in a separate step\n- Output PLAIN TEXT only, no markdown\n- Return only the enhanced text, nothing else",
      messages: [{ role: "user", content: validated }],
    });

    return { success: true as const, data: { content: response.text } };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to elaborate content",
    };
  }
}

export async function adaptContentAction(
  content: string,
  platforms: Platform[]
): Promise<ActionResult<{ adaptations: Record<string, string> }>> {
  await requireAuth();

  const validatedContent = z.string().min(1).max(10_000).parse(content);
  const validatedPlatforms = z.array(platformEnum).min(1).parse(platforms);

  try {
    const { client, model } = await getActiveProviderClient();

    const results = await Promise.all(
      validatedPlatforms.map(async (platform) => {
        const platformRules = getPlatformRules(platform);
        const response = await client.generate({
          model,
          maxTokens: 2048,
          system: `Adapt the following social media post for ${platform}. Follow these platform rules strictly:\n\n${platformRules}\n\nIMPORTANT:\n- Output PLAIN TEXT only. No markdown formatting (no **, *, #, etc.)\n- Use CAPS, line breaks, or emojis for emphasis instead of markdown\n- Include relevant hashtags as specified in the platform rules\n- Return ONLY the adapted post text, nothing else.`,
          messages: [{ role: "user", content: validatedContent }],
        });

        return [platform, response.text] as const;
      })
    );

    const adaptations: Record<string, string> = {};
    for (const [platform, text] of results) {
      adaptations[platform] = text;
    }

    return { success: true as const, data: { adaptations } };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to adapt content",
    };
  }
}

async function publishToPlatform(params: {
  userId: string;
  platform: Platform;
  content: string;
  scheduleAt: Date | null;
  images: Array<{ buffer: Buffer; mimeType: string }>;
}): Promise<PublishResultItem> {
  const { userId, platform, content, scheduleAt, images } = params;

  const socialAccount = await getSocialAccount(userId, platform);
  if (!socialAccount) {
    return {
      platform,
      success: false,
      error: `No connected account for ${platform}`,
    };
  }

  if (scheduleAt) {
    await prisma.post.create({
      data: {
        type: "FREEFORM",
        platform,
        status: "SCHEDULED",
        content,
        scheduledAt: scheduleAt,
      },
    });
    return { platform, success: true };
  }

  const adapter = getAdapter(platform);

  const platformImages =
    images.length > 0 ? await resizeAllForPlatform(images, platform) : [];

  const publishResult = await adapter.publish(
    { content, images: platformImages.length > 0 ? platformImages : undefined },
    {
      accessToken: socialAccount.accessToken,
      refreshToken: socialAccount.refreshToken ?? undefined,
      tokenExpiresAt: socialAccount.tokenExpiresAt ?? undefined,
    }
  );

  await prisma.post.create({
    data: {
      type: "FREEFORM",
      platform,
      status: publishResult.success ? "PUBLISHED" : "FAILED",
      content,
      platformPostId: publishResult.platformPostId ?? null,
      publishedAt: publishResult.success ? new Date() : null,
      errorMessage: publishResult.error ?? null,
    },
  });

  return {
    platform,
    success: publishResult.success,
    platformPostId: publishResult.platformPostId,
    platformUrl: publishResult.platformUrl,
    error: publishResult.error,
  };
}

export async function publishAction(
  formData: FormData
): Promise<ActionResult<{ results: PublishResultItem[] }>> {
  const session = await requireAuth();
  const userId = session.user.id;

  try {
    const adaptationsJson = formData.get("adaptations");
    if (typeof adaptationsJson !== "string") {
      return { success: false as const, error: "Missing adaptations data" };
    }

    const adaptations = z
      .record(z.string(), z.string())
      .parse(JSON.parse(adaptationsJson));

    const imageEntries = formData.getAll("images") as File[];
    const scheduleAtStr = formData.get("scheduleAt") as string | null;
    const scheduleAt = scheduleAtStr ? new Date(scheduleAtStr) : null;

    const images: Array<{ buffer: Buffer; mimeType: string }> = [];
    for (const file of imageEntries) {
      if (file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        images.push({ buffer: Buffer.from(arrayBuffer), mimeType: file.type });
      }
    }

    const platforms = objectKeys(adaptations) as Platform[];

    const results = await Promise.all(
      platforms.map(async (platform): Promise<PublishResultItem> => {
        try {
          return await publishToPlatform({
            userId,
            platform,
            content: adaptations[platform] ?? "",
            scheduleAt,
            images,
          });
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : `Failed to publish to ${platform}`;

          await prisma.post.create({
            data: {
              type: "FREEFORM",
              platform,
              status: "FAILED",
              content: adaptations[platform] ?? "",
              errorMessage,
            },
          });

          return { platform, success: false, error: errorMessage };
        }
      })
    );

    revalidatePath("/");

    return { success: true as const, data: { results } };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to publish content",
    };
  }
}
