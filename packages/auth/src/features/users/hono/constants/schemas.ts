import {
  appSchema,
  roleSchema,
} from "@allonfire/database/features/auth/access/constants/schemas";
import type { UserRecord } from "@allonfire/database/features/auth/user.service";
import { z } from "zod";
import { USER } from "../../constants/users";
import { meetsPasswordRules } from "../../utils/password-rules";

/**
 * A list's query. Every field falls back instead of refusing: the address is
 * the visitor's to edit, and a bad value is no reason for a 400.
 */
export const listQuerySchema = z.object({
  [USER.PARAM.PAGE]: z.coerce
    .number()
    .int()
    .min(USER.DEFAULT_PAGE)
    .max(USER.MAX_PAGE)
    .catch(USER.DEFAULT_PAGE),
  [USER.PARAM.PER_PAGE]: z.coerce
    .number()
    .pipe(z.literal(USER.PAGE_SIZES))
    .catch(USER.DEFAULT_PAGE_SIZE),
  [USER.PARAM.SEARCH]: z.string().catch(""),
});

/** One App a User belongs to, and their Role there. */
const membershipSchema = z.object({ app: appSchema, role: roleSchema });

/**
 * A User as the list shows them. Named `ListedUser` in the docs: Better Auth
 * already calls its own Model `User`, and the API's document holds both.
 */
export const userBodySchema = z
  .object({
    createdAt: z.iso.datetime(),
    email: z.string(),
    id: z.string(),
    /** Their picture's address, when they have one. */
    image: z.string().nullable(),
    memberships: z.array(membershipSchema),
    /** What they are called, when they gave a name. */
    name: z.string().nullable(),
  })
  .meta({ ref: "ListedUser" });
export type UserBody = z.infer<typeof userBodySchema>;

export const userListBodySchema = z
  .object({
    /** How many pages `total` makes at the page size asked for. */
    pageCount: z.number().int(),
    total: z.number().int(),
    users: z.array(userBodySchema),
  })
  .meta({ ref: "UserList" });
export type UserListBody = z.infer<typeof userListBodySchema>;

/** An added User: who, their password, and at most one Membership per App. */
export const userCreateRequestSchema = z.object({
  email: z.email().max(USER.LIMIT.EMAIL_MAX),
  memberships: z
    .array(membershipSchema)
    .refine(
      (memberships) =>
        new Set(memberships.map(({ app }) => app)).size === memberships.length,
      { message: "One Membership per App" }
    ),
  name: z.string().trim().min(1).max(USER.LIMIT.NAME_MAX),
  password: z
    .string()
    .min(USER.LIMIT.PASSWORD_MIN)
    .max(USER.LIMIT.PASSWORD_MAX)
    .refine(meetsPasswordRules),
});

export const userCreatedBodySchema = z
  .object({ id: z.string() })
  .meta({ ref: "UserCreated" });
export type UserCreatedBody = z.infer<typeof userCreatedBodySchema>;

/** A deletion's body: the Users to delete, at most a page of them. */
export const userDeleteRequestSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(USER.MAX_DELETE),
});

export const userDeleteBodySchema = z
  .object({ deleted: z.number().int() })
  .meta({ ref: "UserDeletion" });
export type UserDeleteBody = z.infer<typeof userDeleteBodySchema>;

export const toUserBody = (user: UserRecord): UserBody => ({
  ...user,
  createdAt: user.createdAt.toISOString(),
});
