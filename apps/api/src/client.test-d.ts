import { LOCAL } from "@allonfire/config/local/addresses";
import { hc } from "hono/client";
import type { ApiType, AppType, ErrorCode, ProblemDetails } from "./client";
import { API } from "./shared/constants/api";

describe("client contract", () => {
  it("infers the /health response body", async () => {
    const client = hc<AppType>(LOCAL.URL.API);
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
    const client = hc<ApiType>(LOCAL.URL.API);
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

describe("Laura client contract", () => {
  it("types a Gallery page: favorite is a boolean, nextCursor is text or null", async () => {
    const client = hc<AppType>(LOCAL.URL.API);
    const res = await client.v1.laura.gallery.$get({ query: {} });
    const body = await res.json();
    type Page = Extract<typeof body, { items: unknown }>;

    expectTypeOf<Page>().not.toBeNever();
    expectTypeOf<Page["items"][number]["favorite"]>().toEqualTypeOf<boolean>();
    expectTypeOf<Page["nextCursor"]>().toEqualTypeOf<string | null>();
  });
});

describe("Laura Favorite writes", () => {
  it("takes the Image id as a param", async () => {
    const client = hc<AppType>(LOCAL.URL.API);
    const res = await client.v1.laura.favorites[":imageId"].$put({
      param: { imageId: "x" },
    });
    const body = await res.json();
    type Marked = Extract<typeof body, { favorite: boolean }>;

    expectTypeOf<Marked>().not.toBeNever();
    expectTypeOf<Marked["imageId"]>().toEqualTypeOf<string>();
    // @ts-expect-error the Image id is required
    await client.v1.laura.favorites[":imageId"].$put({ param: {} });
  });
});

describe("admin console client contract", () => {
  it("reads the Users and the overviews under back-office, and no longer at the old paths", () => {
    const client = hc<AppType>(LOCAL.URL.API);
    const backOffice = client.v1[API.SEGMENT.BACK_OFFICE];

    expectTypeOf(backOffice.users.$get).toBeFunction();
    expectTypeOf(backOffice.overview.storage.$get).toBeFunction();
    expectTypeOf(backOffice.overview.users.$get).toBeFunction();
    // They moved under back-office (ADR 0035): the old keys are gone.
    type V1 = typeof client.v1;
    expectTypeOf<"users" | "storage" | "user-usage">().not.toExtend<keyof V1>();
    // The two overviews share one prefix under back-office.
    expectTypeOf<"storage" | "user-usage">().not.toExtend<
      keyof typeof backOffice
    >();
    expectTypeOf<"users" & keyof V1>().toBeNever();
    expectTypeOf<"storage" & keyof V1>().toBeNever();
    expectTypeOf<"user-usage" & keyof V1>().toBeNever();
  });
});
