import {
  CodedError,
  invalidHook,
} from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { EmailTakenError } from "@allonfire/database/features/auth/user.service";
import { hashPassword } from "better-auth/crypto";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { AUTH } from "../../../../shared/constants/auth";
import { guard } from "../../../hono/guards/utils/guard";
import type { AuthEnv } from "../../../hono/types/variables";
import { USER, USER_SEARCH } from "../../constants/users";
import {
  listQuerySchema,
  toUserBody,
  type UserCreatedBody,
  type UserDeleteBody,
  type UserListBody,
  userCreateRequestSchema,
  userDeleteRequestSchema,
} from "../constants/schemas";
import type { UserDeps } from "../utils/deps";
import { createRoute, deleteRoute, listRoute } from "./routes";

const factory = createFactory<AuthEnv>();

/** 401 without a Session, 403 unless the Host lets this User list Users. */
const allowed = (deps: UserDeps) =>
  guard((session) => deps.canListUsers(session.user));

/** 401 without a Session, 403 unless the Host, reading the caller fresh, lets them change Users. */
const canManage = (deps: UserDeps) =>
  guard((session) => deps.canManageUsers(session.user.id));

/** One page of Users, newest first, with how many match in all. */
export const listHandlers = (deps: UserDeps) =>
  factory.createHandlers(
    listRoute,
    allowed(deps),
    validator("query", listQuerySchema, invalidHook),
    async (c) => {
      const query = c.req.valid("query");
      const perPage = query[USER.PARAM.PER_PAGE];
      const { total, users } = await deps.listUsers({
        ...USER_SEARCH.parse(query[USER.PARAM.SEARCH]),
        page: query[USER.PARAM.PAGE],
        perPage,
      });
      const body = {
        pageCount: Math.ceil(total / perPage),
        total,
        users: users.map(toUserBody),
      } satisfies UserListBody;
      return c.json(body, HTTP.STATUS.OK);
    }
  );

/**
 * Deletes the Users named. The caller is read fresh by the Host; a list
 * holding their own id is refused whole, so nobody is deleted.
 */
export const deleteHandlers = (deps: UserDeps) =>
  factory.createHandlers(
    deleteRoute,
    canManage(deps),
    validator("json", userDeleteRequestSchema, invalidHook),
    async (c) => {
      const { ids } = c.req.valid("json");
      if (ids.includes(c.get(AUTH.VAR.SESSION).user.id)) {
        throw new CodedError({
          code: USER.ERROR_CODE.CANNOT_DELETE_SELF,
          status: HTTP.STATUS.FORBIDDEN,
        });
      }
      const body = {
        deleted: await deps.deleteUsers(ids),
      } satisfies UserDeleteBody;
      return c.json(body, HTTP.STATUS.OK);
    }
  );

/**
 * Adds a User with the password the Admin typed, hashed as Better Auth
 * hashes it, so they can sign in at once. A taken email answers 409.
 */
export const createHandlers = (deps: UserDeps) =>
  factory.createHandlers(
    createRoute,
    canManage(deps),
    validator("json", userCreateRequestSchema, invalidHook),
    async (c) => {
      const { password, ...user } = c.req.valid("json");
      try {
        const { id } = await deps.createUser(
          user,
          await hashPassword(password)
        );
        return c.json({ id } satisfies UserCreatedBody, HTTP.STATUS.CREATED);
      } catch (error) {
        if (error instanceof EmailTakenError) {
          throw new CodedError(
            {
              code: USER.ERROR_CODE.EMAIL_TAKEN,
              status: HTTP.STATUS.CONFLICT,
            },
            { cause: error }
          );
        }
        throw error;
      }
    }
  );
