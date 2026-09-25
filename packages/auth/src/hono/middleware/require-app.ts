import { canEnterApp } from "../../access/access";
import type { App } from "../../types/auth";
import { guard } from "../utils/guard";

/** 403 unless the User's Allowed apps hold `app` or `ALL`. Mount it once per App. */
export const requireApp = (app: App) =>
  guard(({ user }) => canEnterApp(user.allowedApps, app));
