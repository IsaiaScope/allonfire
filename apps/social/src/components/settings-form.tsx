"use client";

import { Button } from "@allonfire/ui/components/button";
import { Input } from "@allonfire/ui/components/input";
import { Label } from "@allonfire/ui/components/label";
import { Check, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { updateSettingsAction } from "@/app/actions/settings";

interface SettingsFormProps {
  hasApiKey: boolean;
  webhookDiscoveryUrl: string | null;
  webhookNotifyUrl: string | null;
  webhookPublishUrl: string | null;
}

export function SettingsForm({
  webhookDiscoveryUrl,
  webhookPublishUrl,
  webhookNotifyUrl,
  hasApiKey,
}: SettingsFormProps) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const data = {
      webhookDiscoveryUrl:
        (formData.get("webhookDiscoveryUrl") as string) || null,
      webhookPublishUrl: (formData.get("webhookPublishUrl") as string) || null,
      webhookNotifyUrl: (formData.get("webhookNotifyUrl") as string) || null,
      anthropicApiKey: (formData.get("anthropicApiKey") as string) || null,
    };
    startTransition(async () => {
      await updateSettingsAction(data);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="webhookDiscoveryUrl">Discovery Webhook URL</Label>
          <Input
            defaultValue={webhookDiscoveryUrl ?? ""}
            id="webhookDiscoveryUrl"
            name="webhookDiscoveryUrl"
            placeholder="https://n8n.example.com/webhook/..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="webhookPublishUrl">Publishing Webhook URL</Label>
          <Input
            defaultValue={webhookPublishUrl ?? ""}
            id="webhookPublishUrl"
            name="webhookPublishUrl"
            placeholder="https://n8n.example.com/webhook/..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="webhookNotifyUrl">Notification Webhook URL</Label>
          <Input
            defaultValue={webhookNotifyUrl ?? ""}
            id="webhookNotifyUrl"
            name="webhookNotifyUrl"
            placeholder="https://n8n.example.com/webhook/..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="anthropicApiKey">Claude API Key</Label>
        <Input
          id="anthropicApiKey"
          name="anthropicApiKey"
          placeholder={hasApiKey ? "sk-ant-••••••••" : "sk-ant-..."}
          type="password"
        />
        {hasApiKey && (
          <p className="text-muted-foreground text-xs">
            API key is set. Leave blank to keep current key.
          </p>
        )}
      </div>

      <Button disabled={pending} type="submit">
        {pending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check className="size-3.5" />
            Save Settings
          </>
        )}
      </Button>
    </form>
  );
}
