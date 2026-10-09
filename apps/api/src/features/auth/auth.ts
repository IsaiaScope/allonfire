import { createAuth, toAuthLike } from "@allonfire/auth/features/server/auth";
import { env } from "../../environment/environment";
import { AUTH_BASE_PATH } from "../../shared/constants/routes";

/** Built once at import. Tests never import this; they pass a stub to `createApp`. */
export const auth = toAuthLike(
  createAuth({
    basePath: AUTH_BASE_PATH,
    baseURL: env.AUTH_URL,
    cookieDomain: env.AUTH_COOKIE_DOMAIN,
    secret: env.AUTH_SECRET,
    trustedOrigins: env.API_CORS_ORIGINS,
  })
);
