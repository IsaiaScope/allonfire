import { prisma } from "../index";

export async function getSettings() {
  return await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
    include: { activeProvider: true },
  });
}

export async function updateSettings(data: {
  webhookDiscoveryUrl?: string | null;
  webhookPublishUrl?: string | null;
  webhookNotifyUrl?: string | null;
}) {
  return await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", ...data },
    update: data,
  });
}
