// @module-tag unit
import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AuthEnv } from "../../features/hono/types/variables";
import { AUTH } from "../constants/auth";
import { sessionFor } from "./stub-auth";
import { errorOf, json, moduleTestHost } from "./test-host";

/** Where these tests mount their made-up module. */
const PATH = { BASE: "/module", THROWN: "/thrown" } as const;
const URL_OF = `${PATH.BASE}${PATH.THROWN}`;
const LIMIT = 8;
const ISSUE = { message: "Too long", path: "name" };

/** A module whose one route throws `thrown`, or echoes the Session's user id and the body. */
const moduleThrowing = (thrown?: Error) =>
  new Hono<AuthEnv>().post(PATH.THROWN, async (c) => {
    if (thrown) {
      throw thrown;
    }
    return c.json({
      body: await c.req.json(),
      userId: c.get(AUTH.VAR.SESSION)?.user.id ?? null,
    });
  });

const hostFor = (thrown?: Error, session = sessionFor()) =>
  moduleTestHost({ path: PATH.BASE, routes: moduleThrowing(thrown), session });

describe("moduleTestHost", () => {
  it("mounts the module at the path, with the Session set", async () => {
    const session = sessionFor();
    const res = await hostFor(undefined, session).request(
      URL_OF,
      json(HTTP.METHOD.POST, { name: "sent" })
    );
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual({
      body: { name: "sent" },
      userId: session.user.id,
    });
  });

  it("answers a CodedError with its code, errors and values", async () => {
    const thrown = new CodedError({
      code: ERROR.CODE.VALIDATION_FAILED,
      errors: [ISSUE],
      status: HTTP.STATUS.BAD_REQUEST,
      values: { limit: LIMIT },
    });
    const res = await hostFor(thrown).request(
      URL_OF,
      json(HTTP.METHOD.POST, {})
    );
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect(await errorOf(res)).toEqual({
      code: ERROR.CODE.VALIDATION_FAILED,
      errors: [ISSUE],
      values: { limit: LIMIT },
    });
  });

  it("answers an HTTPException with its status", async () => {
    const res = await hostFor(new HTTPException(HTTP.STATUS.FORBIDDEN)).request(
      URL_OF,
      json(HTTP.METHOD.POST, {})
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
  });

  it("answers an uncoded error as INTERNAL_ERROR", async () => {
    const res = await hostFor(new Error("boom")).request(
      URL_OF,
      json(HTTP.METHOD.POST, {})
    );
    expect(res.status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
    expect(await errorOf(res)).toEqual({ code: ERROR.CODE.INTERNAL_ERROR });
  });
});
