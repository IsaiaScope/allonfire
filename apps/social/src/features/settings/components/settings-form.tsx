"use client";

import { Button } from "@allonfire/ui/components/button";
import { Input } from "@allonfire/ui/components/input";
import { Label } from "@allonfire/ui/components/label";
import { Check, Loader2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { parseErrorMessage } from "@/lib/parse-error-message";
import { updateSettingsAction } from "../actions/settings";

type SettingsFormProps = {
  webhookDiscoveryUrl: string | null;
  webhookNotifyUrl: string | null;
};

export function SettingsForm({
  webhookDiscoveryUrl,
  webhookNotifyUrl,
}: SettingsFormProps) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const data = {
      webhookDiscoveryUrl:
        (formData.get("webhookDiscoveryUrl") as string) || null,
      webhookNotifyUrl: (formData.get("webhookNotifyUrl") as string) || null,
    };
    startTransition(async () => {
      const result = await updateSettingsAction(data);
      if (!result.success) {
        toast.error("Failed to save settings", {
          description: parseErrorMessage(
            result.error ?? "An unexpected error occurred."
          ),
        });
      }
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
          <Label htmlFor="webhookNotifyUrl">Notification Webhook URL</Label>
          <Input
            defaultValue={webhookNotifyUrl ?? ""}
            id="webhookNotifyUrl"
            name="webhookNotifyUrl"
            placeholder="https://n8n.example.com/webhook/..."
          />
        </div>
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
