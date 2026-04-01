import { prisma } from "../index";

export async function getSettings() {
  return await prisma.settings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
    include: { activeProvider: true },
  });
}
