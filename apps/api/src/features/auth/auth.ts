import { createAuth, toAuthLike } from "@allonfire/auth/features/server/auth";
import { env } from "../../environment/environment";
import { AUTH_BASE_PATH } from "../../shared/constants/routes";

/** Built once at import. Tests never import this; they pass a stub to `createApp`. */
export const auth = toAuthLike(
  createAuth({
    basePath: AUTH_BASE_PATH,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: env.CORS_ORIGINS,
  })
);
