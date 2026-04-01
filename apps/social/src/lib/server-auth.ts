import {
  requireAdmin as requireAdminBase,
  requireAuth as requireAuthBase,
  requireUser as requireUserBase,
} from "@allonfire/auth/server";
import { prisma } from "@allonfire/database";
import { auth } from "@/lib/auth";

async function checkAllowedApp(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { allowedApps: true },
  });
  if (
    !(user.allowedApps.includes("all") || user.allowedApps.includes("social"))
  ) {
    throw new Error("Forbidden: no access to this app");
  }
}

export function requireAuth() {
  return requireAuthBase(auth);
}

export async function requireUser() {
  const session = await requireUserBase(auth);
  await checkAllowedApp(session.user.id);
  return session;
}

export async function requireAdmin() {
  const session = await requireAdminBase(auth);
  await checkAllowedApp(session.user.id);
  return session;
}
