import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import type { ImageDeps } from "../utils/deps";
import {
  deleteHandlers,
  getHandlers,
  listHandlers,
  patchHandlers,
  uploadHandlers,
} from "./handlers";

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
