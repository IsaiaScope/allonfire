import { createAuth, toAuthLike } from "@allonfire/auth/features/server/auth";
import { env } from "../../environment/environment";
import { API } from "../../shared/constants/api";
import { avatarLinkNow } from "../../shared/utils/avatar-link";

/** Built once at import. Tests never import this; they pass a stub to `createApp`. */
export const auth = toAuthLike(
  createAuth({
    avatarLink: avatarLinkNow,
    basePath: API.PATH.AUTH,
    baseURL: env.AUTH_URL,
    cookieDomain: env.AUTH_COOKIE_DOMAIN,
    secret: env.AUTH_SECRET,
    trustedOrigins: env.API_CORS_ORIGINS,
  })
);
