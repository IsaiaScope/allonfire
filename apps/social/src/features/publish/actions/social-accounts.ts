"use server";

import {
  deleteSocialAccount,
  getConnectedAccounts,
  type Platform,
} from "@allonfire/database";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/action-result";
import { requireAuth } from "@/lib/server-auth";
import { platformEnum } from "../constants/platforms";
import type { ConnectedAccount } from "../types/publish-types";

export async function getConnectedAccountsAction(): Promise<
  ActionResult<ConnectedAccount[]>
> {
  const session = await requireAuth();

  try {
    const accounts = await getConnectedAccounts(session.user.id);

    return {
      success: true as const,
      data: accounts.map((account) => ({
        platform: account.platform,
        platformUsername: account.platformUsername,
        connectedAt: account.connectedAt,
      })),
    };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch connected accounts",
    };
  }
}

export async function disconnectAccountAction(
  platform: Platform
): Promise<ActionResult> {
  const session = await requireAuth();

  const validatedPlatform = platformEnum.parse(platform);

  try {
    await deleteSocialAccount(session.user.id, validatedPlatform);
    revalidatePath("/publish");
    revalidatePath("/settings");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to disconnect account",
    };
  }
}
