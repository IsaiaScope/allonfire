import { hc } from "hono/client";
import type { ApiType, AppType, ErrorCode, ProblemDetails } from "./client";

describe("client contract", () => {
  it("infers the /health response body", async () => {
    const client = hc<AppType>("http://localhost:3300");
    const res = await client.health.$get({});
    const body = await res.json();

    expectTypeOf(body).toMatchObjectType<{
      readonly status: "ok";
      readonly version: string;
      readonly uptime: number;
    }>();
  });

  it("exposes the error code union", () => {
    expectTypeOf<"RATE_LIMITED">().toExtend<ErrorCode>();
    expectTypeOf<"NOT_A_REAL_CODE">().not.toExtend<ErrorCode>();
  });

  it("types the error envelope on the merged client type", async () => {
    const client = hc<ApiType>("http://localhost:3300");
    const res = await client.health.$get({});
    const body = await res.json();

    // Hono types the response status as the whole `StatusCode` union rather
    // than a per-status union, so `res.status === 500` cannot narrow `res`.
    // Extract the error arm from the body union instead — `type` is the RFC
    // 9457 identity member, and no success body carries one.
    type ErrorArm = Extract<typeof body, { type: unknown }>;

    // Guards the assertion below against passing vacuously: if the merge
    // dropped the envelope, ErrorArm collapses to never and `never` extends
    // everything.
    expectTypeOf<ErrorArm>().not.toBeNever();
    expectTypeOf<ErrorArm>().toExtend<ProblemDetails>();
  });
});
