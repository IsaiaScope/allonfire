import { Hono } from "hono";
import type { AuthEnv } from "../../../hono/types/variables";
import { USER } from "../../constants/users";
import type { UserDeps } from "../utils/deps";
import {
  avatarDeleteHandlers,
  avatarPutHandlers,
  createHandlers,
  deleteHandlers,
  listHandlers,
} from "./handlers";

/**
 * The User module: mount it where the Host wants Users listed, added and
 * deleted, and their Avatars set. It reads the
 * Session the Host's sessionLoader set, and asks the Host who may list and
 * who may delete them.
 */
export const userRoutes = (deps: UserDeps) =>
  new Hono<AuthEnv>()
    .get(USER.PATH.LIST, ...listHandlers(deps))
    .post(USER.PATH.CREATE, ...createHandlers(deps))
    .delete(USER.PATH.DELETE, ...deleteHandlers(deps))
    .put(USER.PATH.AVATAR, ...avatarPutHandlers(deps))
    .delete(USER.PATH.AVATAR, ...avatarDeleteHandlers(deps));
