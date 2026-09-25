// @module-tag unit

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { validator } from "hono-openapi";
import { z } from "zod";
import { notFound, onError, validationHook } from "../middleware/error-handler";
import { problemOf } from "./problem-of";

function testApp() {
  return new Hono()
    .use(requestId())
    .get("/boom", () => {
      throw new Error(
        "Invalid `prisma.user.findMany()` on column `secret_col`"
      );
    })
    .get("/nope", () => {
      throw new HTTPException(403, { message: "not allowed" });
    })
    .get("/teapot", () => {
      throw new HTTPException(418);
    })
    .onError(onError)
    .notFound(notFound);
}

describe("onError", () => {
  it("maps an HTTPException to its status and a code", async () => {
    const res = await testApp().request("/nope");
    expect(res.status).toBe(403);
    const body = await problemOf(res);
    expect(body.code).toBe("FORBIDDEN");
    expect(body.detail).toBe("not allowed");
    expect(body.requestId).toBeTruthy();
  });

  it("answers 500 for a status the API does not document", async () => {
    const res = await testApp().request("/teapot");
    expect(res.status).toBe(500);
    expect((await problemOf(res)).code).toBe("INTERNAL_ERROR");
  });

  it("never leaks an unknown error's message", async () => {
    const res = await testApp().request("/boom");
    expect(res.status).toBe(500);
    const body = await problemOf(res);
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.detail).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain("secret_col");
  });

  it("returns NOT_FOUND in the same envelope for unmatched routes", async () => {
    const res = await testApp().request("/missing");
    expect(res.status).toBe(404);
    const body = await problemOf(res);
    expect(body.code).toBe("NOT_FOUND");
  });
});

describe("validationHook", () => {
  const app = new Hono()
    .use(requestId())
    .post(
      "/echo",
      validator(
        "json",
        z.object({ age: z.number(), email: z.email() }),
        validationHook
      ),
      (context) => context.json(context.req.valid("json"))
    )
    .onError(onError);

  it("returns 400 with field paths and no schema dump", async () => {
    const res = await app.request("/echo", {
      body: JSON.stringify({ age: "old", email: "nope" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(res.status).toBe(400);
    const body = await problemOf(res);
    expect(body.code).toBe("VALIDATION_FAILED");
    const paths = (body.errors ?? []).map((d: { path: string }) => d.path);
    expect(paths).toContain("email");
    expect(paths).toContain("age");
    expect(JSON.stringify(body)).not.toContain("ZodError");
  });
});
