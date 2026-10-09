import { prisma } from "../prisma/client";

export async function getUserById(userId: string) {
  return await prisma.user.findUnique({
    select: {
      createdAt: true,
      email: true,
      id: true,
      memberships: { select: { app: true, role: true } },
      name: true,
    },
    where: { id: userId },
  });
}

export async function getUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      createdAt: true,
      email: true,
      id: true,
      memberships: { select: { app: true, role: true } },
      name: true,
    },
  });
}

export async function deleteUser(userId: string) {
  return await prisma.user.delete({
    where: { id: userId },
  });
}
