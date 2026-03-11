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
import { Globe, Key, Webhook } from "lucide-react";
import { SettingsForm } from "@/components/settings-form";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Configure integrations and automation.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* n8n Integration + API Key */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="size-4 text-primary" />
              <CardTitle className="text-base">n8n Integration & API</CardTitle>
            </div>
            <CardDescription>
              Webhook URLs for workflows and Claude API key for content
              generation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm
              hasApiKey={Boolean(settings.anthropicApiKey)}
              webhookDiscoveryUrl={settings.webhookDiscoveryUrl}
              webhookNotifyUrl={settings.webhookNotifyUrl}
              webhookPublishUrl={settings.webhookPublishUrl}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Platform Connections */}
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

        {/* API Key Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="size-4 text-primary" />
              <CardTitle className="text-base">Webhook API Key</CardTitle>
            </div>
            <CardDescription>
              Shared secret for n8n-to-app communication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Set{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                ALLONFIRE_API_KEY
              </code>{" "}
              in your environment variables. n8n workflows use this key in the{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                X-API-Key
              </code>{" "}
              header when calling webhook endpoints.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
