import { AllowedApp, Role } from "@allonfire/database/enums";
import { Hono } from "hono";
import type { AuthSession } from "../../types/auth";
import { requireApp } from "../middleware/require-app";
import { requireRole } from "../middleware/require-role";
import { requireSession } from "../middleware/require-session";
import type { AuthEnv } from "../types/variables";

// Before a guard the Session may be missing.
new Hono<AuthEnv>().get("/", (c) => {
  expectTypeOf(c.get("session")).toEqualTypeOf<AuthSession | null>();
  return c.text("ok");
});

// After any guard the handler sees it as present.
new Hono<AuthEnv>()
  .get("/a", requireSession(), (c) => {
    expectTypeOf(c.get("session")).toEqualTypeOf<AuthSession>();
    return c.text("ok");
  })
  .get("/b", requireRole(Role.USER), (c) => {
    expectTypeOf(c.get("session")).toEqualTypeOf<AuthSession>();
    return c.text("ok");
  });

// Mounted once with `use`, it covers every route chained after it.
new Hono<AuthEnv>().use(requireApp(AllowedApp.LAURA)).get("/", (c) => {
  expectTypeOf(c.get("session")).toEqualTypeOf<AuthSession>();
  return c.text("ok");
});

// @ts-expect-error ALL is a grant, not an App a route can belong to
requireApp(AllowedApp.ALL);
// @ts-expect-error a Role comes from the enum, not a free string
requireRole("OWNER");
