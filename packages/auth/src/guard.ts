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

async function getSessionAndRole(auth: Auth) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { role: true },
  });
  return { session, role: user.role };
}

export async function checkMutationAccess(
  auth: Auth
): Promise<MutationAccessResult> {
  const result = await getSessionAndRole(auth);
  if (!result) {
    return { allowed: false, reason: "notAuthenticated" };
  }
  if (result.role === "VIEWER") {
    return { allowed: false, reason: "viewerRestricted" };
  }
  return { allowed: true, session: result.session };
}

export async function checkAdminAccess(
  auth: Auth
): Promise<MutationAccessResult> {
  const result = await getSessionAndRole(auth);
  if (!result) {
    return { allowed: false, reason: "notAuthenticated" };
  }
  if (result.role !== "ADMIN") {
    return { allowed: false, reason: "adminRequired" };
  }
  return { allowed: true, session: result.session };
}
