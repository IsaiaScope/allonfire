import {
  CodedError,
  invalidHook,
} from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { EmailTakenError } from "@allonfire/database/features/auth/user.service";
import { hashPassword } from "better-auth/crypto";
import { bodyLimit } from "hono/body-limit";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { AUTH } from "../../../../shared/constants/auth";
import { linkedPicture } from "../../../../shared/utils/linked-picture";
import { guard } from "../../../hono/guards/utils/guard";
import type { AuthEnv } from "../../../hono/types/variables";
import { USER, USER_SEARCH } from "../../constants/users";
import {
  avatarFormSchema,
  listQuerySchema,
  toUserBody,
  type UserAvatarBody,
  type UserCreatedBody,
  type UserDeleteBody,
  type UserListBody,
  userCreateRequestSchema,
  userDeleteRequestSchema,
  userIdParamSchema,
} from "../constants/schemas";
import type { UserDeps } from "../utils/deps";
import {
  avatarDeleteRoute,
  avatarPutRoute,
  createRoute,
  deleteRoute,
  listRoute,
} from "./routes";

const factory = createFactory<AuthEnv>();

const userNotFound = () =>
  new CodedError({
    code: ERROR.CODE.NOT_FOUND,
    status: HTTP.STATUS.NOT_FOUND,
  });

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
        users: users.map((user) => toUserBody(user, deps.avatarLink)),
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
      // Read before the rows go: the cascade takes `User.image` with them.
      const images = await deps.userImages(ids);
      const body = {
        deleted: await deps.deleteUsers(ids),
      } satisfies UserDeleteBody;
      await deps.deleteAvatars(images);
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

/**
 * Sets a User's Avatar: the picture processed and stored under a new name,
 * that name written to the User, the picture it replaced deleted. An unknown
 * User answers 404, and the file just stored is deleted.
 */
export const avatarPutHandlers = (deps: UserDeps) =>
  factory.createHandlers(
    avatarPutRoute,
    canManage(deps),
    bodyLimit({
      maxSize: deps.avatarMaxBytes,
      onError: () => {
        throw new CodedError({
          code: ERROR.CODE.PAYLOAD_TOO_LARGE,
          status: HTTP.STATUS.PAYLOAD_TOO_LARGE,
          values: { limit: deps.avatarMaxBytes },
        });
      },
    }),
    validator("param", userIdParamSchema, invalidHook),
    validator("form", avatarFormSchema, invalidHook),
    async (c) => {
      const { id } = c.req.valid("param");
      const { file } = c.req.valid("form");
      const picture = await deps.saveAvatar(
        id,
        Buffer.from(await file.arrayBuffer())
      );
      const changed = await deps.setUserImage(id, picture);
      if (!changed) {
        await deps.deleteAvatars([picture.image]);
        throw userNotFound();
      }
      await deps.deleteAvatars([changed.previous]);
      return c.json(
        linkedPicture(
          { image: picture.image, imageBlurDataUrl: picture.blurDataUrl },
          deps.avatarLink
        ) satisfies UserAvatarBody,
        HTTP.STATUS.OK
      );
    }
  );

/** Removes a User's Avatar and deletes its file; an unknown User answers 404. */
export const avatarDeleteHandlers = (deps: UserDeps) =>
  factory.createHandlers(
    avatarDeleteRoute,
    canManage(deps),
    validator("param", userIdParamSchema, invalidHook),
    async (c) => {
      const changed = await deps.setUserImage(c.req.valid("param").id, null);
      if (!changed) {
        throw userNotFound();
      }
      await deps.deleteAvatars([changed.previous]);
      return c.body(null, HTTP.STATUS.NO_CONTENT);
    }
  );
