"use server";

import { checkUserAppAccess, prisma } from "@allonfire/database";
import { cookies } from "next/headers";

export async function checkAppAccessAction(appName: string): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("better-auth.session_token")?.value;
  if (!sessionToken) {
    return false;
  }

  const session = await prisma.session.findUnique({
    where: { token: sessionToken },
    select: { userId: true, expiresAt: true },
  });
  if (!session || session.expiresAt < new Date()) {
    return false;
  }

  return checkUserAppAccess(session.userId, appName);
}
