import type { ProviderType } from "../../generated/prisma/client";
import { prisma } from "../index";
import { decrypt, encrypt } from "../utils/encryption";

export async function getProviders() {
  const providers = await prisma.aiProvider.findMany({
    orderBy: { createdAt: "asc" },
  });

  return providers.map((p) => ({
    ...p,
    apiKey: maskKey(p.apiKey),
  }));
}

export async function getActiveProvider() {
  const settings = await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
    include: { activeProvider: true },
  });

  if (!settings.activeProvider) {
    return null;
  }

  return {
    ...settings.activeProvider,
    apiKey: decrypt(settings.activeProvider.apiKey),
  };
}

export async function upsertProvider(data: {
  provider: ProviderType;
  apiKey: string;
  model: string;
  isVerified: boolean;
}) {
  const encryptedKey = encrypt(data.apiKey);

  return await prisma.aiProvider.upsert({
    where: { provider: data.provider },
    create: {
      provider: data.provider,
      apiKey: encryptedKey,
      model: data.model,
      isVerified: data.isVerified,
      lastVerifiedAt: data.isVerified ? new Date() : null,
    },
    update: {
      apiKey: encryptedKey,
      model: data.model,
      isVerified: data.isVerified,
      lastVerifiedAt: data.isVerified ? new Date() : undefined,
    },
  });
}

export async function setActiveProvider(providerId: string) {
  return await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", activeProviderId: providerId },
    update: { activeProviderId: providerId },
  });
}

export async function deleteProvider(providerId: string) {
  return await prisma.aiProvider.delete({
    where: { id: providerId },
  });
}

export async function getProviderWithDecryptedKey(provider: ProviderType) {
  const record = await prisma.aiProvider.findUnique({
    where: { provider },
  });

  if (!record) {
    return null;
  }

  return {
    ...record,
    apiKey: decrypt(record.apiKey),
  };
}

function maskKey(encryptedKey: string): string {
  try {
    const plaintext = decrypt(encryptedKey);
    return `${"•".repeat(Math.max(0, plaintext.length - 4))}${plaintext.slice(-4)}`;
  } catch {
    return "••••••••";
  }
}
