import { checkAppAccess } from "@allonfire/auth/guard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Publish" };

import type { Platform } from "@allonfire/database";
import { getActiveProvider, getConnectedAccounts } from "@allonfire/database";
import { Send } from "lucide-react";
import { env } from "@/env";
import { PublishClient } from "@/features/publish/components/publish-client";
import { ViewerBanner } from "@/features/sidebar-layout/components/viewer-banner";
import { auth } from "@/lib/auth";

function getConfiguredPlatforms(): Platform[] {
  const platforms: Platform[] = [];
  if (env.TWITTER_CLIENT_ID && env.TWITTER_CLIENT_SECRET) {
    platforms.push("TWITTER");
  }
  if (env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET) {
    platforms.push("LINKEDIN");
  }
  return platforms;
}

export default async function PublishPage() {
  const { session, user } = await checkAppAccess(auth, "social");
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
      {user.role === "VIEWER" && <ViewerBanner />}
      <PublishClient
        configuredPlatforms={configuredPlatforms}
        connectedAccounts={accounts}
        hasAiProvider={!!activeProvider}
        role={user.role}
      />
    </div>
  );
}
