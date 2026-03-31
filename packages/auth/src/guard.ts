import { prisma } from "@allonfire/database";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Auth, Session } from "./server";

export const checkAppAccess = cache(async function checkAppAccess(
  auth: Auth,
  appName: string
) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true, allowedApps: true },
  });

  if (
    !(user.allowedApps.includes("all") || user.allowedApps.includes(appName))
  ) {
    redirect("/login?error=access-denied");
  }

  return { session, user };
});

export type MutationAccessResult =
  | { allowed: true; session: Session }
  | { allowed: false; reason: string };

export async function checkMutationAccess(
  auth: Auth
): Promise<MutationAccessResult> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return { allowed: false, reason: "Not authenticated" };
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (user.role === "VIEWER") {
    return { allowed: false, reason: "Viewers have read-only access" };
  }

  return { allowed: true, session };
}
