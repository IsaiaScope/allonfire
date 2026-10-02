import type { App } from "../../../shared/types/auth";
import { mayEnter } from "../../access/access";
import { guard } from "../utils/guard";

/** 403 unless the User may enter `app` (`mayEnter`). Mount it once per App. */
export const requireApp = (app: App) =>
  guard(({ user }) => mayEnter(user, app));
