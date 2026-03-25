import type { Platform } from "@allonfire/database";
import { getActiveProvider, getConnectedAccounts } from "@allonfire/database";
import { Send } from "lucide-react";
import { env } from "@/env";
import { PublishClient } from "@/features/publish/components/publish-client";
import { requireAuth } from "@/lib/server-auth";

function getConfiguredPlatforms(): Platform[] {
  const platforms: Platform[] = [];
  if (env.TWITTER_CLIENT_ID && env.TWITTER_CLIENT_SECRET) {
    platforms.push("TWITTER");
  }
  if (env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET) {
    platforms.push("LINKEDIN");
  }
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    platforms.push("YOUTUBE");
  }
  return platforms;
}

export default async function PublishPage() {
  const session = await requireAuth();
  const connectedAccounts = await getConnectedAccounts(session.user.id);
  const activeProvider = await getActiveProvider();
  const configuredPlatforms = getConfiguredPlatforms();

  const accounts = connectedAccounts.map((a) => ({
    platform: a.platform,
    platformUsername: a.platformUsername,
    connectedAt: a.connectedAt,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Send className="size-6 text-primary" />
        <h1 className="font-bold text-2xl tracking-tight">Publish</h1>
      </div>
      <PublishClient
        configuredPlatforms={configuredPlatforms}
        connectedAccounts={accounts}
        hasAiProvider={!!activeProvider}
      />
    </div>
  );
}
