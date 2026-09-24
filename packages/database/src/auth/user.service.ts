import { prisma } from "../client";

export async function getUserById(userId: string) {
  return await prisma.user.findUnique({
    select: {
      allowedApps: true,
      createdAt: true,
      email: true,
      id: true,
      name: true,
      role: true,
    },
    where: { id: userId },
  });
}

export async function getUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      allowedApps: true,
      createdAt: true,
      email: true,
      id: true,
      name: true,
      role: true,
    },
  });
}

export async function deleteUser(userId: string) {
  return await prisma.user.delete({
    where: { id: userId },
  });
}

export async function checkUserAppAccess(
  userId: string,
  appName: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    select: { allowedApps: true },
    where: { id: userId },
  });
  if (!user) {
    return false;
  }
  return user.allowedApps.includes("all") || user.allowedApps.includes(appName);
}

export async function updateUserAllowedApps(
  userId: string,
  allowedApps: string[]
) {
  return await prisma.user.update({
    data: { allowedApps },
    where: { id: userId },
  });
}
