import type { AuthEnv } from "@allonfire/auth/shared/types/variables";
import { Hono } from "hono";
import {
  deleteHandlers,
  getHandlers,
  listHandlers,
  patchHandlers,
  uploadHandlers,
} from "./handlers";
import type { ImageDeps } from "./utils/deps";

/**
 * The Image module (ADR 0015): mount it where the host wants Images; it
 * reads the Session the host's sessionLoader set.
 */
export const imageRoutes = (deps: ImageDeps) =>
  new Hono<AuthEnv>()
    .get("/", ...listHandlers(deps))
    .get("/:id", ...getHandlers(deps))
    .post("/", ...uploadHandlers(deps))
    .patch("/", ...patchHandlers(deps))
    .delete("/", ...deleteHandlers(deps));
