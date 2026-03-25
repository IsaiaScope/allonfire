import {
  getDueScheduledPosts,
  logWebhook,
  markFailed,
  markPublished,
} from "@allonfire/database";
import { NextResponse } from "next/server";
import { z } from "zod";
import { validateBearerToken } from "@/lib/api-auth";

// TODO: For FREEFORM posts created via /publish, scheduled publishing requires
// a process-scheduled route that resolves the post creator's SocialAccount tokens.
// Currently, the Post model has no userId field, so we can't look up tokens for
// scheduled FREEFORM posts. Options: (1) add userId to Post, (2) add a PostCreator
// join table, or (3) store userId in post metadata. Until then, FREEFORM posts
// with scheduling are picked up by this webhook for external processing (e.g. n8n).
export async function GET(request: Request) {
  const authError = validateBearerToken(request);
  if (authError) {
    return authError;
  }

  try {
    const duePosts = await getDueScheduledPosts();

    const response = {
      posts: duePosts.map((post) => ({
        id: post.id,
        platform: post.platform,
        content: post.content,
        mediaUrl: post.mediaUrl,
        topicTitle: post.topic?.title,
        scheduledAt: post.scheduledAt,
      })),
    };

    await logWebhook({
      endpoint: "/api/webhooks/publish",
      method: "GET",
      response: { postCount: duePosts.length },
      status: 200,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    try {
      await logWebhook({
        endpoint: "/api/webhooks/publish",
        method: "GET",
        response: { error: message },
        status: 500,
      });
    } catch {
      // Best-effort logging — don't mask the original error
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

const resultSchema = z.object({
  results: z.array(
    z.object({
      postId: z.cuid2(),
      success: z.boolean(),
      platformPostId: z.string().optional(),
      error: z.string().optional(),
    })
  ),
});

export async function PATCH(request: Request) {
  const authError = validateBearerToken(request);
  if (authError) {
    return authError;
  }

  try {
    const body = await request.json();
    const { results } = resultSchema.parse(body);

    for (const result of results) {
      if (result.success) {
        await markPublished(result.postId, result.platformPostId);
      } else {
        await markFailed(result.postId, result.error ?? "Publishing failed");
      }
    }

    const response = {
      processed: results.length,
      published: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };

    await logWebhook({
      endpoint: "/api/webhooks/publish",
      method: "PATCH",
      payload: { resultCount: results.length },
      response,
      status: 200,
    });

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";

    try {
      await logWebhook({
        endpoint: "/api/webhooks/publish",
        method: "PATCH",
        response: { error: message },
        status: 400,
      });
    } catch {
      // Best-effort logging — don't mask the original error
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
