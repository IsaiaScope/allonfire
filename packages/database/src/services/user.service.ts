import { prisma } from "../index";

export async function getUserById(userId: string) {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      allowedApps: true,
      createdAt: true,
    },
  });
}

export async function getUsers() {
  return await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      allowedApps: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
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
    where: { id: userId },
    select: { allowedApps: true },
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
    where: { id: userId },
    data: { allowedApps },
  });
}
