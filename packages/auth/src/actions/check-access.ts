import { checkUserAppAccess } from "@allonfire/database";
import { headers } from "next/headers";
import type { Auth } from "../server";

export function createCheckAppAccessAction(auth: Auth) {
  return async function checkAppAccessAction(
    appName: string
  ): Promise<boolean> {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session) {
      return false;
    }
    return checkUserAppAccess(session.user.id, appName);
  };
}
