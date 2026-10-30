// @module-tag integration
// The auth bucket on real Redis, under a key prefix of its own so no other
// run's attempts count.
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { createApp } from "../../../app";
import { env } from "../../../environment/environment";
import { appDeps } from "../../../shared/tests/app-deps";
import { signIn } from "../../../shared/tests/sign-in";
import { createRedisStore } from "../../rate-limit/middleware/rate-limiter";
import { awaitReady, createRedis } from "../../redis/redis";
import { auth } from "../auth";

// The env is parsed at import: the prefix must exist before the imports run.
vi.hoisted(() => {
  process.env.AUTH_RATE_LIMIT_KEY_PREFIX = `auth:test:${Date.now()}:`;
});

const redis = createRedis(env.API_REDIS_URL);
const app = createApp(appDeps({ auth, store: createRedisStore(redis) }));

// Commands before `ready` fail, and the limiter fails open: it would count nothing.
beforeAll(() => awaitReady(redis));

afterAll(async () => {
  await redis.quit();
});

it("answers 429 once the auth limit is spent inside the window", async () => {
  const admin = FIXTURE.USER.BACK_OFFICE.ADMIN;
  const attempts = await Promise.all(
    Array.from({ length: env.AUTH_RATE_LIMIT_MAX }, () =>
      signIn(app, admin, { password: "wrong-password-1" })
    )
  );
  expect(attempts.map(({ status }) => status)).toEqual(attempts.map(() => 401));
  expect((await signIn(app, admin)).status).toBe(429);
});
