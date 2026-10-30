import { App } from "@allonfire/database/enums";
import { Hono } from "hono";
import type { AuthSession } from "../../../../shared/types/auth";
import type { AuthEnv } from "../../types/variables";
import { requireApp } from "../middleware/require-app";
import { requireSession } from "../middleware/require-session";

// Before a guard the Session may be missing.
new Hono<AuthEnv>().get("/", (c) => {
  expectTypeOf(c.get("session")).toEqualTypeOf<AuthSession | null>();
  return c.text("ok");
});

// After any guard the handler sees it as present.
new Hono<AuthEnv>().get("/a", requireSession(), (c) => {
  expectTypeOf(c.get("session")).toEqualTypeOf<AuthSession>();
  return c.text("ok");
});

// Mounted once with `use`, it covers every route chained after it.
new Hono<AuthEnv>().use(requireApp(App.LAURA)).get("/", (c) => {
  expectTypeOf(c.get("session")).toEqualTypeOf<AuthSession>();
  return c.text("ok");
});

// @ts-expect-error an App comes from the enum, not a free string
requireApp("back-office");
