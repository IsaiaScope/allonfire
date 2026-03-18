import { getSettings } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Separator } from "@allonfire/ui/components/separator";
import { Globe, Key, Palette, Webhook } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsForm } from "@/features/settings/components/settings-form";

export default async function GeneralSettingsPage() {
  const settings = await getSettings();

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Webhook className="size-4 text-primary" />
            <CardTitle className="text-base">n8n Integration</CardTitle>
          </div>
          <CardDescription>
            Webhook URLs for discovery, publishing, and notification workflows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            webhookDiscoveryUrl={settings.webhookDiscoveryUrl}
            webhookNotifyUrl={settings.webhookNotifyUrl}
            webhookPublishUrl={settings.webhookPublishUrl}
          />
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            <CardTitle className="text-base">Platforms</CardTitle>
          </div>
          <CardDescription>Connected social media accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {["LinkedIn", "Twitter / X", "YouTube", "TikTok"].map(
              (platform) => (
                <div
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                  key={platform}
                >
                  <span className="font-medium text-sm">{platform}</span>
                  <Badge variant="secondary">Via n8n</Badge>
                </div>
              )
            )}
          </div>
          <p className="mt-3 text-muted-foreground text-xs">
            Platform connections are managed through n8n OAuth credentials.
          </p>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="size-4 text-primary" />
            <CardTitle className="text-base">n8n Bearer Token</CardTitle>
          </div>
          <CardDescription>
            Shared secret for n8n-to-app communication.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Set{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              N8N_API_KEY
            </code>{" "}
            in your environment variables. n8n workflows send this token in the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              Authorization: Bearer
            </code>{" "}
            header when calling webhook and classification endpoints.
          </p>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="size-4 text-primary" />
            <CardTitle className="text-base">Appearance</CardTitle>
          </div>
          <CardDescription>Toggle between light and dark mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="font-medium text-sm">Dark mode</p>
              <p className="text-muted-foreground text-xs">
                Switch the interface between light and dark theme.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <p className="text-muted-foreground text-sm">
        AI provider keys are managed in the{" "}
        <Link
          className="text-primary underline underline-offset-4"
          href="/admin/providers"
        >
          Admin Panel
        </Link>
        .
      </p>
    </div>
  );
}
