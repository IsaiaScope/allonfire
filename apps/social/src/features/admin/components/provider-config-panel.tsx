"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@allonfire/ui/components/alert-dialog";
import { Button } from "@allonfire/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Combobox } from "@allonfire/ui/components/combobox";
import { Input } from "@allonfire/ui/components/input";
import { Label } from "@allonfire/ui/components/label";
import {
  Check,
  CircleCheck,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Plug,
  RefreshCw,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { parseErrorMessage } from "@/lib/parse-error-message";
import type { ProviderType } from "../actions/providers";
import {
  deleteProviderAction,
  listModelsAction,
  revealApiKeyAction,
  saveProviderAction,
  setActiveProviderAction,
  testConnectionAction,
} from "../actions/providers";

type ProviderConfigPanelProps = {
  provider: ProviderType;
  name: string;
  existingId: string | null;
  existingModel: string | null;
  maskedKey: string | null;
  isActive: boolean;
  isVerified: boolean;
  onClose: () => void;
};

function KeyInput({
  provider,
  apiKey,
  setApiKey,
  maskedKey,
  storedKey,
  isVerified,
  showKey,
  isBusy,
  onToggleVisibility,
  onCopy,
  copied,
}: {
  provider: string;
  apiKey: string;
  setApiKey: (v: string) => void;
  maskedKey: string | null;
  storedKey: string | null;
  isVerified: boolean;
  showKey: boolean;
  isBusy: boolean;
  onToggleVisibility: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const displayValue = showKey && !apiKey ? (storedKey ?? "") : apiKey;
  const placeholder = maskedKey && !showKey ? maskedKey : "Enter API key...";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={`${provider}-key`}>API Key</Label>
        {maskedKey && (
          <button
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            disabled={isBusy}
            onClick={onCopy}
            type="button"
          >
            {copied ? (
              <Check className="size-3.5 text-green-500" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        )}
      </div>
      <div className="relative">
        <Input
          className="pr-10"
          id={`${provider}-key`}
          name="apiKey"
          onChange={(e) => {
            setApiKey(e.target.value);
          }}
          placeholder={placeholder}
          type={apiKey || showKey ? "text" : "password"}
          value={displayValue}
        />
        {maskedKey && !apiKey && (
          <button
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            disabled={isBusy}
            onClick={onToggleVisibility}
            type="button"
          >
            {showKey ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        )}
      </div>
      {maskedKey && !apiKey && (
        <p className="flex items-center gap-1 text-muted-foreground text-xs">
          {isVerified ? (
            <CircleCheck className="size-3 text-green-500" />
          ) : null}
          Key is set. Enter a new key to replace it.
        </p>
      )}
    </div>
  );
}

function ActionButtons({
  existingId,
  isActive,
  isBusy,
  hasKey,
  saving,
  testing,
  activating,
  deleting,
  onSave,
  onTest,
  onActivate,
  onDelete,
}: {
  existingId: string | null;
  isActive: boolean;
  isBusy: boolean;
  hasKey: boolean;
  saving: boolean;
  testing: boolean;
  activating: boolean;
  deleting: boolean;
  onSave: () => void;
  onTest: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={isBusy || !hasKey} onClick={onSave}>
        {saving ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Save className="size-3.5" />
        )}
        {existingId ? "Save Changes" : "Save & Validate Key"}
      </Button>

      {existingId && (
        <Button disabled={isBusy} onClick={onTest} variant="secondary">
          {testing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plug className="size-3.5" />
          )}
          Test Connection
        </Button>
      )}

      {existingId && !isActive && (
        <Button disabled={isBusy} onClick={onActivate} variant="secondary">
          {activating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Star className="size-3.5" />
          )}
          Set as Active
        </Button>
      )}

      {existingId && !isActive && (
        <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
          <Button
            disabled={isBusy}
            onClick={() => setConfirmOpen(true)}
            variant="ghost"
          >
            {deleting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Delete
          </Button>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete provider?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this provider configuration and its
                API key. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function ModelSelector({
  provider,
  model,
  setModel,
  fetchedModels,
  loadingModels,
  isBusy,
  onRefresh,
}: {
  provider: string;
  model: string;
  setModel: (v: string) => void;
  fetchedModels: Array<{ id: string; label: string }> | null;
  loadingModels: boolean;
  isBusy: boolean;
  onRefresh: () => void;
}) {
  if (!(fetchedModels || loadingModels)) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {fetchedModels ? (
          <Label htmlFor={`${provider}-model`}>Model</Label>
        ) : (
          <span className="font-medium text-sm leading-none">Model</span>
        )}
        <button
          className="flex items-center gap-1 text-muted-foreground text-xs hover:text-foreground disabled:opacity-50"
          disabled={isBusy}
          onClick={onRefresh}
          type="button"
        >
          {loadingModels ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <RefreshCw className="size-3" />
          )}
          Refresh Models
        </button>
      </div>
      {loadingModels && !fetchedModels && (
        <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-muted-foreground text-sm">
          <Loader2 className="size-3.5 animate-spin" />
          Loading available models...
        </div>
      )}
      {fetchedModels && (
        <Combobox
          disabled={isBusy}
          emptyMessage="No models found."
          id={`${provider}-model`}
          onValueChange={setModel}
          options={fetchedModels.map((m) => ({
            value: m.id,
            label: m.label,
          }))}
          placeholder="Select a model"
          searchPlaceholder="Search models..."
          value={model}
        />
      )}
    </div>
  );
}

export function ProviderConfigPanel({
  provider,
  name,
  existingId,
  existingModel,
  maskedKey,
  isActive,
  isVerified,
  onClose,
}: ProviderConfigPanelProps) {
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(existingModel ?? "");
  const [showKey, setShowKey] = useState(false);
  const [storedKey, setStoredKey] = useState<string | null>(null);
  const [fetchedModels, setFetchedModels] = useState<Array<{
    id: string;
    label: string;
  }> | null>(null);
  const [saving, startSaveTransition] = useTransition();
  const [testing, startTestTransition] = useTransition();
  const [activating, startActivateTransition] = useTransition();
  const [deleting, startDeleteTransition] = useTransition();
  const [loadingModels, startModelsTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const testDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasFetchedModels = useRef(false);

  useEffect(
    () => () => {
      if (testDebounce.current) {
        clearTimeout(testDebounce.current);
      }
    },
    []
  );

  // Auto-fetch models when the panel opens for an existing provider
  useEffect(() => {
    if (!existingId || hasFetchedModels.current) {
      return;
    }
    hasFetchedModels.current = true;
    startModelsTransition(async () => {
      const res = await listModelsAction(provider);
      if (res.success) {
        setFetchedModels(res.models);
        setModel((prev) => {
          if (prev && res.models.some((m) => m.id === prev)) {
            return prev;
          }
          return res.models[0]?.id ?? "";
        });
      } else {
        toast.error("Failed to load models", {
          description: parseErrorMessage(
            res.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }, [existingId, provider]);

  const handleToggleKeyVisibility = useCallback(() => {
    if (showKey) {
      setShowKey(false);
      return;
    }
    if (storedKey) {
      setShowKey(true);
      return;
    }
    startTestTransition(async () => {
      const res = await revealApiKeyAction(provider);
      if (res.success) {
        setStoredKey(res.apiKey);
        setShowKey(true);
      } else {
        toast.error("Failed to reveal API key", {
          description: res.error ?? "An unexpected error occurred.",
        });
      }
    });
  }, [showKey, storedKey, provider]);

  const handleCopyKey = useCallback(() => {
    const keyToCopy = apiKey || storedKey;
    if (keyToCopy) {
      navigator.clipboard.writeText(keyToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    startTestTransition(async () => {
      const res = await revealApiKeyAction(provider);
      if (res.success) {
        setStoredKey(res.apiKey);
        navigator.clipboard.writeText(res.apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error("Failed to reveal API key", {
          description: res.error ?? "An unexpected error occurred.",
        });
      }
    });
  }, [apiKey, storedKey, provider]);

  const handleRefreshModels = useCallback(() => {
    startModelsTransition(async () => {
      const res = await listModelsAction(provider, apiKey || undefined);
      if (res.success) {
        setFetchedModels(res.models);
        setModel((prev) => {
          if (prev && res.models.some((m) => m.id === prev)) {
            return prev;
          }
          return res.models[0]?.id ?? "";
        });
      } else {
        toast.error("Failed to load models", {
          description: parseErrorMessage(
            res.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }, [provider, apiKey]);

  const handleSave = useCallback(() => {
    if (!(apiKey || maskedKey)) {
      return;
    }

    startSaveTransition(async () => {
      const res = await saveProviderAction({
        provider,
        apiKey: apiKey || undefined,
        model,
      });
      if (res.success) {
        setApiKey("");
        setShowKey(false);
        setStoredKey(null);
      } else {
        toast.error("Failed to save provider", {
          description: parseErrorMessage(
            res.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }, [apiKey, maskedKey, provider, model]);

  const handleTest = useCallback(() => {
    if (testDebounce.current) {
      clearTimeout(testDebounce.current);
    }
    testDebounce.current = setTimeout(() => {
      startTestTransition(async () => {
        const res = await testConnectionAction(provider, apiKey || undefined);
        if (res.success) {
          toast.success("Connection successful.");
        } else {
          toast.error("Connection failed", {
            description: parseErrorMessage(
              res.error ?? "An unexpected error occurred."
            ),
          });
        }
      });
    }, 1000);
  }, [provider, apiKey]);

  const handleActivate = useCallback(() => {
    if (!existingId) {
      return;
    }
    startActivateTransition(async () => {
      if (model) {
        await saveProviderAction({ provider, model });
      }
      const result = await setActiveProviderAction(existingId);
      if (!result.success) {
        toast.error("Failed to activate provider", {
          description: result.error ?? "An unexpected error occurred.",
        });
      }
    });
  }, [existingId, provider, model]);

  const handleDelete = useCallback(() => {
    if (!existingId) {
      return;
    }
    startDeleteTransition(async () => {
      const res = await deleteProviderAction(existingId);
      if (res.success) {
        onClose();
      } else {
        toast.error("Failed to delete provider", {
          description: parseErrorMessage(
            res.error ?? "An unexpected error occurred."
          ),
        });
      }
    });
  }, [existingId, onClose]);

  const isBusy = saving || testing || activating || deleting || loadingModels;

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base">{name} Configuration</CardTitle>
        <Button onClick={onClose} size="sm" variant="ghost">
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <KeyInput
          apiKey={apiKey}
          copied={copied}
          isBusy={testing}
          isVerified={isVerified}
          maskedKey={maskedKey}
          onCopy={handleCopyKey}
          onToggleVisibility={handleToggleKeyVisibility}
          provider={provider}
          setApiKey={setApiKey}
          showKey={showKey && Boolean(storedKey)}
          storedKey={storedKey}
        />

        {existingId && (
          <ModelSelector
            fetchedModels={fetchedModels}
            isBusy={isBusy}
            loadingModels={loadingModels}
            model={model}
            onRefresh={handleRefreshModels}
            provider={provider}
            setModel={setModel}
          />
        )}

        {!existingId && (
          <p className="text-muted-foreground text-xs">
            Save your API key first — model selection will appear after
            validation.
          </p>
        )}

        <ActionButtons
          activating={activating}
          deleting={deleting}
          existingId={existingId}
          hasKey={Boolean(apiKey || maskedKey)}
          isActive={isActive}
          isBusy={isBusy}
          onActivate={handleActivate}
          onDelete={handleDelete}
          onSave={handleSave}
          onTest={handleTest}
          saving={saving}
          testing={testing}
        />
      </CardContent>
    </Card>
  );
}
