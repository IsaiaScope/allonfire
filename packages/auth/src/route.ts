import { toNextJsHandler } from "better-auth/next-js";
import type { Auth } from "./server";

export function createAuthHandler(auth: Auth) {
  return toNextJsHandler(auth);
}
