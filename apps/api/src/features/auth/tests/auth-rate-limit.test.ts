// @module-tag unit
import {
  CHANGE_PASSWORD_PATH,
  SIGN_IN_EMAIL_PATH,
} from "@allonfire/auth/shared/constants/paths";
import { HTTP_HEADER } from "@allonfire/utils/constants/http";
import { createApp } from "../../../app";
import { env } from "../../../environment/environment";
import { AUTH_BASE_PATH } from "../../../shared/constants/routes";
import { apiAuth, appDeps } from "../../../shared/tests/app-deps";
import { memoryStore } from "../../rate-limit/tests/memory-store";

const SIGN_IN_ROUTE = `${AUTH_BASE_PATH}${SIGN_IN_EMAIL_PATH}`;
const CHANGE_PASSWORD_ROUTE = `${AUTH_BASE_PATH}${CHANGE_PASSWORD_PATH}`;
const ok = apiAuth({ handler: () => Promise.resolve(new Response("{}")) });

describe("auth bucket", () => {
  it("answers 429 as a problem document after the limit", async () => {
    const app = createApp(appDeps({ auth: ok }));
    const allowed = await Promise.all(
      Array.from({ length: env.AUTH_RATE_LIMIT_MAX }, async () => {
        const res = await app.request(SIGN_IN_ROUTE, { method: "POST" });
        return res.status;
      })
    );
    expect(allowed).toEqual(new Array(env.AUTH_RATE_LIMIT_MAX).fill(200));
    const res = await app.request(SIGN_IN_ROUTE, { method: "POST" });
    expect(res.status).toBe(429);
    expect(res.headers.get("content-type")).toContain(
      "application/problem+json"
    );
    expect(res.headers.get(HTTP_HEADER.RETRY_AFTER)).not.toBeNull();
  });

  it("counts only sign-in, under its own key in the shared store", async () => {
    const store = memoryStore();
    const app = createApp(appDeps({ auth: ok, store }));
    const authKey = `${env.AUTH_RATE_LIMIT_KEY_PREFIX}unknown`;

    await app.request(`${AUTH_BASE_PATH}/get-session`);
    expect(store.hits.has(authKey)).toBe(false);

    await app.request(SIGN_IN_ROUTE, { method: "POST" });
    expect([...store.hits.keys()].sort()).toEqual([authKey, "unknown"]);
  });

  it("counts a trailing-slash variant too", async () => {
    const store = memoryStore();
    const app = createApp(appDeps({ auth: ok, store }));
    await app.request(`${SIGN_IN_ROUTE}/`, { method: "POST" });
    expect(store.hits.get(`${env.AUTH_RATE_LIMIT_KEY_PREFIX}unknown`)).toBe(1);
  });

  it("shares one bucket between sign-in and change-password", async () => {
    const store = memoryStore();
    const app = createApp(appDeps({ auth: ok, store }));

    await app.request(SIGN_IN_ROUTE, { method: "POST" });
    await app.request(CHANGE_PASSWORD_ROUTE, { method: "POST" });

    expect(store.hits.get(`${env.AUTH_RATE_LIMIT_KEY_PREFIX}unknown`)).toBe(2);
  });
});
