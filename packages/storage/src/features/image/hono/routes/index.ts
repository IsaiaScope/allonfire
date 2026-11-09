import type { AuthEnv } from "@allonfire/auth/features/hono/types/variables";
import { Hono } from "hono";
import { STORAGE } from "../../../../shared/constants/paths";
import type { ImageDeps } from "../utils/deps";
import { getHandlers, listHandlers } from "./read-handlers";
import {
  deleteHandlers,
  patchHandlers,
  uploadHandlers,
} from "./write-handlers";

/**
 * The Image module (ADR 0015): mount it where the host wants Images. It
 * reads the Session the host's sessionLoader set: reads work without one,
 * writes answer 401 (ADR 0020).
 */
export const imageRoutes = (deps: ImageDeps) =>
  new Hono<AuthEnv>()
    .get(STORAGE.PATH.LIST, ...listHandlers(deps))
    .get(STORAGE.PATH.ONE, ...getHandlers(deps))
    .post(STORAGE.PATH.LIST, ...uploadHandlers(deps))
    .patch(STORAGE.PATH.LIST, ...patchHandlers(deps))
    .delete(STORAGE.PATH.LIST, ...deleteHandlers(deps));
