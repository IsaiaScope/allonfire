"use client";

import { Button } from "@allonfire/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Input } from "@allonfire/ui/components/input";
import { Label } from "@allonfire/ui/components/label";
import {
  Check,
  CircleCheck,
  Loader2,
  Plug,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useRef, useState, useTransition } from "react";
import {
  deleteProviderAction,
  saveProviderAction,
  setActiveProviderAction,
  testConnectionAction,
} from "../actions/providers";

type ProviderConfigPanelProps = {
  provider: "ANTHROPIC" | "OPENROUTER";
  name: string;
  existingId: string | null;
  existingModel: string | null;
  maskedKey: string | null;
  isActive: boolean;
  isVerified: boolean;
  models: ReadonlyArray<{ id: string; label: string }>;
  defaultModel: string;
  onClose: () => void;
};

export function ProviderConfigPanel({
  provider,
  name,
  existingId,
  existingModel,
  maskedKey,
  isActive,
  isVerified,
  models,
  defaultModel,
  onClose,
}: ProviderConfigPanelProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(existingModel ?? defaultModel);
  const [customModel, setCustomModel] = useState(false);
  const [saving, startSaveTransition] = useTransition();
  const [testing, startTestTransition] = useTransition();
  const [activating, startActivateTransition] = useTransition();
  const [deleting, startDeleteTransition] = useTransition();
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const testDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSave = useCallback(() => {
    if (!(apiKey || maskedKey)) {
      return;
    }
    setResult(null);

    startSaveTransition(async () => {
      const res = await saveProviderAction({
        provider,
        apiKey: apiKey || "",
        model,
      });
      if (res.success) {
        setResult({ type: "success", message: "Provider saved and verified" });
        setApiKey("");
      } else {
        setResult({
          type: "error",
          message: res.error ?? "Failed to save",
        });
      }
    });
  }, [apiKey, maskedKey, provider, model]);

  const handleTest = useCallback(() => {
    if (testDebounce.current) {
      clearTimeout(testDebounce.current);
    }
    testDebounce.current = setTimeout(() => {
      setResult(null);
      startTestTransition(async () => {
        const res = await testConnectionAction(provider);
        if (res.success) {
          setResult({ type: "success", message: "Connection successful" });
        } else {
          setResult({
            type: "error",
            message: res.error ?? "Connection failed",
          });
        }
      });
    }, 1000);
  }, [provider]);

  const handleActivate = useCallback(() => {
    if (!existingId) {
      return;
    }
    startActivateTransition(async () => {
      await setActiveProviderAction(existingId);
      setResult({ type: "success", message: "Set as active provider" });
    });
  }, [existingId]);

  const handleDelete = useCallback(() => {
    if (!existingId) {
      return;
    }
    startDeleteTransition(async () => {
      const res = await deleteProviderAction(existingId);
      if (res.success) {
        onClose();
      } else {
        setResult({
          type: "error",
          message: res.error ?? "Failed to delete",
        });
      }
    });
  }, [existingId, onClose]);

  const isBusy = saving || testing || activating || deleting;

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base">{name} Configuration</CardTitle>
        <Button onClick={onClose} size="sm" variant="ghost">
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor={`${provider}-key`}>API Key</Label>
          <Input
            id={`${provider}-key`}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={
              maskedKey ? `Current: ${maskedKey}` : "Enter API key..."
            }
            type="password"
            value={apiKey}
          />
          {maskedKey && !apiKey && (
            <p className="flex items-center gap-1 text-muted-foreground text-xs">
              {isVerified ? (
                <CircleCheck className="size-3 text-green-500" />
              ) : null}
              Key is set. Enter a new key to replace it.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${provider}-model`}>Model</Label>
          {customModel ? (
            <div className="space-y-1">
              <Input
                id={`${provider}-model`}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Enter custom model ID..."
                value={model}
              />
              <button
                className="text-primary text-xs underline underline-offset-4"
                onClick={() => setCustomModel(false)}
                type="button"
              >
                Choose from list
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                id={`${provider}-model`}
                onChange={(e) => setModel(e.target.value)}
                value={model}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                className="text-primary text-xs underline underline-offset-4"
                onClick={() => setCustomModel(true)}
                type="button"
              >
                Enter custom model ID
              </button>
            </div>
          )}
        </div>

        {result && (
          <p
            className={`flex items-center gap-1.5 text-sm ${
              result.type === "success" ? "text-green-600" : "text-red-600"
            }`}
          >
            {result.type === "success" ? (
              <Check className="size-3.5" />
            ) : (
              <X className="size-3.5" />
            )}
            {result.message}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            disabled={isBusy || !(apiKey || maskedKey)}
            onClick={handleSave}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Save className="size-3.5" />
            )}
            Save Changes
          </Button>

          {existingId && (
            <Button disabled={isBusy} onClick={handleTest} variant="secondary">
              {testing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plug className="size-3.5" />
              )}
              Test Connection
            </Button>
          )}

          {existingId && !isActive && (
            <Button
              disabled={isBusy}
              onClick={handleActivate}
              variant="secondary"
            >
              {activating ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Star className="size-3.5" />
              )}
              Set as Active
            </Button>
          )}

          {existingId && !isActive && (
            <Button disabled={isBusy} onClick={handleDelete} variant="ghost">
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
