"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { getConnectedAccountsAction } from "@/features/publish/actions/social-accounts";
import { PlatformConnect } from "@/features/publish/components/platform-connect";
import { platformEnum } from "@/features/publish/constants/platforms";
import type { ConnectedAccount } from "@/features/publish/types/publish-types";

export function ConnectedPlatforms() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);

  const fetchAccounts = useCallback(async () => {
    const result = await getConnectedAccountsAction();
    if (result.success) {
      setAccounts(result.data);
    } else {
      toast.error(result.error);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return (
    <div className="space-y-3">
      {platformEnum.options.map((platform) => {
        const account = accounts.find((a) => a.platform === platform);

        return (
          <div className="rounded-md border px-4 py-3" key={platform}>
            <PlatformConnect
              isConnected={!!account}
              onConnected={fetchAccounts}
              onDisconnected={fetchAccounts}
              platform={platform}
              username={account?.platformUsername}
            />
          </div>
        );
      })}
    </div>
  );
}
