"use client";

import type { Platform } from "@allonfire/database";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@allonfire/ui/components/alert-dialog";
import { Button } from "@allonfire/ui/components/button";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { disconnectAccountAction } from "../actions/social-accounts";
import { PLATFORM_CONFIG } from "../constants/platforms";

type PlatformConnectProps = {
  platform: Platform;
  isConnected: boolean;
  username?: string | null;
  onConnected: () => void;
  onDisconnected: () => void;
};

export function PlatformConnect({
  platform,
  isConnected,
  username,
  onConnected,
  onDisconnected,
}: PlatformConnectProps) {
  const [isLoading, setIsLoading] = useState(false);
  const display = PLATFORM_CONFIG[platform] ?? {
    label: platform,
    icon: platform[0],
    charLimit: 1000,
  };

  const handleOAuthMessage = useCallback(
    (event: MessageEvent) => {
      if (event.data?.type === "oauth-complete") {
        setIsLoading(false);
        onConnected();
      } else if (event.data?.type === "oauth-error") {
        setIsLoading(false);
        toast.error(event.data.message ?? "OAuth connection failed");
      }
    },
    [onConnected]
  );

  useEffect(() => {
    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [handleOAuthMessage]);

  function handleConnect() {
    setIsLoading(true);
    window.open(
      `/api/publish/oauth/${platform.toLowerCase()}?action=authorize`,
      "oauth-popup",
      "width=600,height=700,scrollbars=yes"
    );
  }

  async function handleDisconnect() {
    setIsLoading(true);
    try {
      const result = await disconnectAccountAction(platform);
      if (result.success) {
        onDisconnected();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to disconnect account");
    } finally {
      setIsLoading(false);
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">
          Logged in as{" "}
          <span className="font-medium text-foreground">
            {username ?? "Unknown"}
          </span>
        </span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="ml-auto"
              disabled={isLoading}
              size="sm"
              variant="secondary"
            >
              {isLoading && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Disconnect
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect {display.label}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove your {display.label} connection. You will need
                to reconnect to publish to this platform.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDisconnect}>
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded bg-muted font-bold text-muted-foreground text-xs">
        {display.icon}
      </span>
      <span className="text-muted-foreground text-sm">{display.label}</span>
      <Button
        className="ml-auto"
        disabled={isLoading}
        onClick={handleConnect}
        size="sm"
      >
        {isLoading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
        Connect
      </Button>
    </div>
  );
}
