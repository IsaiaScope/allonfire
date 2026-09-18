import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import { validator } from "hono-openapi";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  notFound,
  onError,
  type ProblemDetails,
  validationHook,
} from "../middleware/error-handler";

// undici types `Response.json()` as `Promise<unknown>`; these tests assert on
// the envelope, so name the shape once here.
const envelopeOf = async (res: Response) =>
  (await res.json()) as ProblemDetails;

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
    .onError(onError)
    .notFound(notFound);
}

describe("onError", () => {
  it("maps an HTTPException to its status and a code", async () => {
    const res = await testApp().request("/nope");
    expect(res.status).toBe(403);
    const body = await envelopeOf(res);
    expect(body.code).toBe("FORBIDDEN");
    expect(body.detail).toBe("not allowed");
    expect(body.requestId).toBeTruthy();
  });

  it("never leaks an unknown error's message", async () => {
    const res = await testApp().request("/boom");
    expect(res.status).toBe(500);
    const body = await envelopeOf(res);
    expect(body.code).toBe("INTERNAL_ERROR");
    expect(body.detail).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain("secret_col");
  });

  it("returns NOT_FOUND in the same envelope for unmatched routes", async () => {
    const res = await testApp().request("/missing");
    expect(res.status).toBe(404);
    const body = await envelopeOf(res);
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
        z.object({ email: z.email(), age: z.number() }),
        validationHook
      ),
      (context) => context.json(context.req.valid("json"))
    )
    .onError(onError);

  it("returns 400 with field paths and no schema dump", async () => {
    const res = await app.request("/echo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "nope", age: "old" }),
    });

    expect(res.status).toBe(400);
    const body = await envelopeOf(res);
    expect(body.code).toBe("VALIDATION_FAILED");
    const paths = (body.errors ?? []).map((d: { path: string }) => d.path);
    expect(paths).toContain("email");
    expect(paths).toContain("age");
    expect(JSON.stringify(body)).not.toContain("ZodError");
  });
});
