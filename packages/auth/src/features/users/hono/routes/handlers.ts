import {
  CodedError,
  invalidHook,
  notFound,
  payloadTooLarge,
} from "@allonfire/core/features/errors/coded-error";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { roleIn } from "@allonfire/database/features/auth/access/access";
import { EmailTakenError } from "@allonfire/database/features/auth/user.service";
import { hashPassword } from "better-auth/crypto";
import { bodyLimit } from "hono/body-limit";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { AUTH } from "../../../../shared/constants/auth";
import { linkedPicture } from "../../../../shared/utils/linked-picture";
import { guard } from "../../../hono/guards/utils/guard";
import { manageGuard } from "../../../hono/guards/utils/manage-guard";
import type { AuthEnv } from "../../../hono/types/variables";
import { USER } from "../../constants/users";
import {
  avatarDeleteRequestSchema,
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
  userUpdateRequestSchema,
} from "../constants/schemas";
import type { UserDeps } from "../utils/deps";
import {
  avatarDeleteRoute,
  avatarPutRoute,
  createRoute,
  deleteRoute,
  listRoute,
  readRoute,
  updateRoute,
} from "./routes";

const factory = createFactory<AuthEnv>();

/** 401 without a Session, 403 unless the Host lets this User list Users. */
const allowed = (deps: UserDeps) =>
  guard((session) => deps.canListUsers(session.user));

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
        ...USER.SEARCH.parse(query[USER.PARAM.SEARCH]),
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
    manageGuard(deps.canManageUsers),
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
      if (body.deleted > 0) {
        await deps.changed();
      }
      return c.json(body, HTTP.STATUS.OK);
    }
  );

/**
 * Adds a User with the password the Admin typed, hashed as Better Auth
 * hashes it, so they can sign in at once, and answers their id and Version.
 * A taken email answers 409.
 */
export const createHandlers = (deps: UserDeps) =>
  factory.createHandlers(
    createRoute,
    manageGuard(deps.canManageUsers),
    validator("json", userCreateRequestSchema, invalidHook),
    async (c) => {
      const { password, ...user } = c.req.valid("json");
      try {
        const { id, version } = await deps.createUser(
          user,
          await hashPassword(password)
        );
        return c.json(
          { id, version } satisfies UserCreatedBody,
          HTTP.STATUS.CREATED
        );
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
 * that name written to the User on the Version the change was made on, the
 * picture it replaced deleted. An unknown User answers 404, and the file just
 * stored is deleted, as it is when the write fails or the User changed since
 * (409, thrown by the service).
 */
export const avatarPutHandlers = (deps: UserDeps) =>
  factory.createHandlers(
    avatarPutRoute,
    manageGuard(deps.canManageUsers),
    bodyLimit({
      maxSize: deps.avatarMaxBytes,
      onError: () => {
        throw payloadTooLarge(deps.avatarMaxBytes);
      },
    }),
    validator("param", userIdParamSchema, invalidHook),
    validator("form", avatarFormSchema, invalidHook),
    async (c) => {
      const { id } = c.req.valid("param");
      const { file, version } = c.req.valid("form");
      const picture = await deps.saveAvatar(
        id,
        Buffer.from(await file.arrayBuffer())
      );
      // The file just stored is deleted unless the User's row now names it.
      const changed = await deps
        .setUserImage(id, picture, { expectedVersion: version })
        .catch(async (error: unknown) => {
          await deps.deleteAvatars([picture.image]);
          throw error;
        });
      if (!changed) {
        await deps.deleteAvatars([picture.image]);
        throw notFound();
      }
      await deps.deleteAvatars([changed.previous]);
      await deps.changed();
      return c.json(
        linkedPicture(picture, deps.avatarLink) satisfies UserAvatarBody,
        HTTP.STATUS.OK
      );
    }
  );

/**
 * Removes a User's Avatar, on the Version the change was made on, and
 * deletes its file; an unknown User answers 404, one changed since 409.
 */
export const avatarDeleteHandlers = (deps: UserDeps) =>
  factory.createHandlers(
    avatarDeleteRoute,
    manageGuard(deps.canManageUsers),
    validator("param", userIdParamSchema, invalidHook),
    validator("json", avatarDeleteRequestSchema, invalidHook),
    async (c) => {
      const changed = await deps.setUserImage(c.req.valid("param").id, null, {
        expectedVersion: c.req.valid("json").version,
      });
      if (!changed) {
        throw notFound();
      }
      await deps.deleteAvatars([changed.previous]);
      await deps.changed();
      return c.body(null, HTTP.STATUS.NO_CONTENT);
    }
  );

/** One User, their Avatar signed for now; an unknown id answers 404. */
export const readHandlers = (deps: UserDeps) =>
  factory.createHandlers(
    readRoute,
    manageGuard(deps.canManageUsers),
    validator("param", userIdParamSchema, invalidHook),
    async (c) => {
      const user = await deps.readUser(c.req.valid("param").id);
      if (!user) {
        throw notFound();
      }
      return c.json(toUserBody(user, deps.avatarLink), HTTP.STATUS.OK);
    }
  );

/**
 * Edits a User. The caller is read fresh by the Host; their own Role in the
 * Host's `manageApp` stays as it is (403 otherwise, nothing changed), and a
 * new password, hashed as Better Auth hashes it, ends every Session of the
 * User but the caller's own.
 */
export const updateHandlers = (deps: UserDeps) =>
  factory.createHandlers(
    updateRoute,
    manageGuard(deps.canManageUsers),
    validator("param", userIdParamSchema, invalidHook),
    validator("json", userUpdateRequestSchema, invalidHook),
    async (c) => {
      const { id } = c.req.valid("param");
      const { emailVerified, memberships, name, password, version } =
        c.req.valid("json");
      const session = c.get(AUTH.VAR.SESSION);
      const self = id === session.user.id;
      if (self && memberships) {
        const stored = await deps.readUser(id);
        if (
          stored &&
          roleIn({ memberships }, deps.manageApp) !==
            roleIn(stored, deps.manageApp)
        ) {
          throw new CodedError({
            code: USER.ERROR_CODE.CANNOT_CHANGE_OWN_ROLE,
            status: HTTP.STATUS.FORBIDDEN,
          });
        }
      }
      // Changed since the edit's Version: the service throws the 409.
      const user = await deps.updateUser(
        id,
        {
          ...(name !== undefined && { name }),
          ...(emailVerified !== undefined && { emailVerified }),
          ...(memberships && { memberships }),
          ...(password !== undefined && {
            hashedPassword: await hashPassword(password),
          }),
        },
        {
          expectedVersion: version,
          ...(self && { keepSessionId: session.session.id }),
        }
      );
      if (!user) {
        throw notFound();
      }
      return c.json(toUserBody(user, deps.avatarLink), HTTP.STATUS.OK);
    }
  );
