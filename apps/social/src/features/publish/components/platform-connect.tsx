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
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ReadOnlyButton } from "@/components/read-only-button";
import { disconnectAccountAction } from "../actions/social-accounts";
import { PLATFORM_CONFIG } from "../constants/platforms";

type PlatformConnectProps = {
  platform: Platform;
  isConnected: boolean;
  username?: string | null;
  onConnected: () => void;
  onDisconnected: () => void;
  role?: string;
};

export function PlatformConnect({
  platform,
  isConnected,
  username,
  onConnected,
  onDisconnected,
  role,
}: PlatformConnectProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isViewer = role === "VIEWER";
  const display = PLATFORM_CONFIG[platform] ?? {
    label: platform,
    icon: platform[0],
    charLimit: 1000,
  };

  const onConnectedRef = useRef(onConnected);
  onConnectedRef.current = onConnected;
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.data?.type === "oauth-complete" &&
        event.data.platform === platform
      ) {
        stopPolling();
        setIsLoading(false);
        onConnectedRef.current();
      } else if (
        event.data?.type === "oauth-error" &&
        (!event.data.platform || event.data.platform === platform)
      ) {
        stopPolling();
        setIsLoading(false);
        toast.error(event.data.error ?? "OAuth connection failed");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      stopPolling();
      popupRef.current?.close();
    };
  }, [platform, stopPolling]);

  function handleConnect() {
    setIsLoading(true);
    const popup = window.open(
      `/api/publish/oauth/${platform.toLowerCase()}?action=authorize`,
      "oauth-popup",
      "width=600,height=700,scrollbars=yes"
    );
    popupRef.current = popup;

    // Poll for popup closed without completing OAuth
    stopPolling();
    pollRef.current = setInterval(() => {
      if (popup?.closed) {
        stopPolling();
        setIsLoading(false);
      }
    }, 500);
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
        <span className="flex size-6 items-center justify-center rounded bg-muted font-bold text-muted-foreground text-xs">
          {display.icon}
        </span>
        <div className="min-w-0">
          <span className="font-medium text-sm">{display.label}</span>
          <p className="truncate text-muted-foreground text-xs">
            {username ?? "Unknown"}
          </p>
        </div>
        {isViewer ? (
          <ReadOnlyButton
            size="sm"
            variant="secondary"
            wrapperClassName="ml-auto"
          >
            Disconnect
          </ReadOnlyButton>
        ) : (
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
                  This will remove your {display.label} connection. You will
                  need to reconnect to publish to this platform.
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
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="flex size-6 items-center justify-center rounded bg-muted font-bold text-muted-foreground text-xs">
        {display.icon}
      </span>
      <span className="text-muted-foreground text-sm">{display.label}</span>
      {isViewer ? (
        <ReadOnlyButton size="sm" wrapperClassName="ml-auto">
          Connect
        </ReadOnlyButton>
      ) : (
        <Button
          className="ml-auto"
          disabled={isLoading}
          onClick={handleConnect}
          size="sm"
        >
          {isLoading && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
          Connect
        </Button>
      )}
    </div>
  );
}
