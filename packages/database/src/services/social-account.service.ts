import type { Platform } from "../../generated/prisma/client";
import { prisma } from "../index";
import { decrypt, encrypt } from "../utils/encryption";

export async function getConnectedAccounts(userId: string) {
  const accounts = await prisma.socialAccount.findMany({
    where: { userId },
    select: {
      id: true,
      platform: true,
      platformUserId: true,
      platformUsername: true,
      connectedAt: true,
    },
    orderBy: { connectedAt: "asc" },
  });

  return accounts;
}

export async function getSocialAccount(userId: string, platform: Platform) {
  const record = await prisma.socialAccount.findUnique({
    where: { userId_platform: { userId, platform } },
  });

  if (!record) {
    return null;
  }

  return {
    ...record,
    accessToken: decrypt(record.accessToken),
    refreshToken: record.refreshToken ? decrypt(record.refreshToken) : null,
  };
}

export async function upsertSocialAccount(data: {
  userId: string;
  platform: Platform;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  platformUserId?: string | null;
  platformUsername?: string | null;
}) {
  const encryptedAccessToken = encrypt(data.accessToken);
  const encryptedRefreshToken = data.refreshToken
    ? encrypt(data.refreshToken)
    : null;

  return await prisma.socialAccount.upsert({
    where: {
      userId_platform: { userId: data.userId, platform: data.platform },
    },
    create: {
      userId: data.userId,
      platform: data.platform,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: data.tokenExpiresAt ?? null,
      platformUserId: data.platformUserId ?? null,
      platformUsername: data.platformUsername ?? null,
    },
    update: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      tokenExpiresAt: data.tokenExpiresAt ?? null,
      platformUserId: data.platformUserId ?? undefined,
      platformUsername: data.platformUsername ?? undefined,
    },
  });
}

export async function deleteSocialAccount(userId: string, platform: Platform) {
  return await prisma.socialAccount.delete({
    where: { userId_platform: { userId, platform } },
  });
}
